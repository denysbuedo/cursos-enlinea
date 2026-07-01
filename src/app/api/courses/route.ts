import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// Bugfix #2: búsqueda case-insensitive con ILIKE

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await rateLimit(`courses:${ip}`, RATE_LIMITS.VERIFY);
  if (!success) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes" },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const currency = searchParams.get("currency");
  const pricingModel = searchParams.get("pricingModel");
  const search = searchParams.get("search");
  const status = searchParams.get("status") || "PUBLISHED";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = Math.min(
    parseInt(searchParams.get("pageSize") || "12", 10),
    50
  );

  const where: Record<string, unknown> = {
    status,
    visibility: "PUBLIC",
  };

  if (currency && ["CUP", "USD", "EUR"].includes(currency)) {
    where.currency = currency;
    // Si filtra por moneda, excluir cursos gratuitos (a menos que filtre explícitamente por FREE)
    if (pricingModel !== "FREE") {
      where.pricingModel = { not: "FREE" };
    }
  }

  if (pricingModel && ["FREE", "PAID"].includes(pricingModel)) {
    where.pricingModel = pricingModel;
  }

  if (search) {
    // Búsqueda case-insensitive usando PostgreSQL ILIKE
    const searchPattern = `%${search}%`;
    const matching: { id: string }[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM "Course" WHERE status = 'PUBLISHED' AND visibility = 'PUBLIC' AND ("title"->>'es' ILIKE $1 OR "title"->>'en' ILIKE $1 OR "slug" ILIKE $1)`,
      searchPattern
    );
    where.id = { in: matching.map((c) => c.id) };
  }

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        _count: { select: { enrollments: true, sessions: true } },
        sessions: {
          where: { preview: true },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.course.count({ where }),
  ]);

  return NextResponse.json({
    data: courses,
    total,
    page,
    pageSize,
  });
}

// POST /api/courses — Crear o actualizar curso (ADMIN o INSTRUCTOR)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await request.json();
    const { id, slug, title, description, pricingModel, price, currency, visibility, status } = body;

    if (!slug || !title || !description) {
      return NextResponse.json({ error: "Faltan campos: slug, title, description" }, { status: 400 });
    }

    let result;
    if (id) {
      result = await prisma.course.update({
        where: { id },
        data: {
          slug, title, description,
          pricingModel: pricingModel || "FREE",
          price: price || null,
          currency: currency || "USD",
          visibility: visibility || "PUBLIC",
          status: status || "PUBLISHED",
        },
      });
    } else {
      result = await prisma.course.create({
        data: {
          slug, title, description,
          pricingModel: pricingModel || "FREE",
          price: price || null,
          currency: currency || "USD",
          visibility: visibility || "PUBLIC",
          status: status || "PUBLISHED",
          instructorId: session.userId,
        },
      });
    }

    return NextResponse.json({ data: result }, { status: id ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
