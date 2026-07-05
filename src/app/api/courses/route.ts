import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// Bugfix #2: búsqueda case-insensitive con ILIKE

function localizedTextHasSpanish(value: unknown) {
  return Boolean(
    value &&
      typeof value === "object" &&
      "es" in value &&
      typeof value.es === "string" &&
      value.es.trim()
  );
}

async function validatePublishableCourse(
  courseId: string | undefined,
  data: {
    slug?: string;
    title: unknown;
    description: unknown;
    pricingModel?: string;
    price?: number | null;
  }
) {
  const missing: string[] = [];

  if (!data.slug?.trim() || !localizedTextHasSpanish(data.title) || !localizedTextHasSpanish(data.description)) {
    missing.push("Ficha básica completa");
  }

  if (data.pricingModel === "PAID" && (!data.price || Number(data.price) <= 0)) {
    missing.push("Precio válido para curso pago");
  }

  if (!courseId) {
    missing.push("Al menos una sesión publicada con video");
  } else {
    const [publishedEditions, videoSessions] = await Promise.all([
      prisma.courseEdition.count({ where: { courseId, status: "PUBLISHED" } }),
      prisma.session.count({ where: { courseId, status: "PUBLISHED", videoUrl: { not: null } } }),
    ]);

    if (publishedEditions < 1) missing.push("Al menos una edición publicada");
    if (videoSessions < 1) missing.push("Al menos una sesión publicada con video");
  }

  return missing;
}

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
          where: { preview: true, status: "PUBLISHED" },
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
    const {
      id,
      slug,
      title,
      description,
      learningObjectives,
      targetAudience,
      requirements,
      competencies,
      estimatedHours,
      weeklyHours,
      level,
      language,
      certificateAvailable,
      selfPaced,
      pricingModel,
      price,
      currency,
      visibility,
      status,
    } = body;
    const nextPrice = pricingModel === "FREE" ? null : Number(price || 0);

    if (!slug || !title || !description) {
      return NextResponse.json({ error: "Faltan campos: slug, title, description" }, { status: 400 });
    }

    let result;
    if (id) {
      const existing = await prisma.course.findUnique({
        where: { id },
        select: { id: true, instructorId: true, status: true },
      });
      if (!existing) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
      if (session.role !== "ADMIN" && existing.instructorId !== session.userId) {
        return NextResponse.json({ error: "No eres el instructor de este curso" }, { status: 403 });
      }
      const nextStatus = status || existing.status;

      if (nextStatus === "PUBLISHED") {
        const missing = await validatePublishableCourse(id, {
          slug,
          title,
          description,
          pricingModel: pricingModel || "FREE",
          price: nextPrice,
        });
        if (missing.length) {
          return NextResponse.json({ error: "Curso no publicable", missing }, { status: 400 });
        }
      }

      result = await prisma.course.update({
        where: { id },
        data: {
          slug, title, description,
          learningObjectives: learningObjectives || null,
          targetAudience: targetAudience || null,
          requirements: requirements || null,
          competencies: competencies || null,
          estimatedHours: estimatedHours ? Number(estimatedHours) : null,
          weeklyHours: weeklyHours ? Number(weeklyHours) : null,
          level: level || null,
          language: language || "es",
          certificateAvailable: certificateAvailable !== undefined ? Boolean(certificateAvailable) : true,
          selfPaced: selfPaced !== undefined ? Boolean(selfPaced) : true,
          pricingModel: pricingModel || "FREE",
          price: nextPrice,
          currency: currency || "USD",
          visibility: visibility || "PUBLIC",
          status: nextStatus,
        },
      });

      if (existing.status !== result.status) {
        await prisma.auditLog.create({
          data: {
            action: "COURSE_STATUS_UPDATED",
            entity: "Course",
            entityId: result.id,
            userId: session.userId,
            metadata: { previousStatus: existing.status, status: result.status },
          },
        });
      }
    } else {
      const nextStatus = status || "DRAFT";
      if (nextStatus === "PUBLISHED") {
        const missing = await validatePublishableCourse(undefined, {
          slug,
          title,
          description,
          pricingModel: pricingModel || "FREE",
          price: nextPrice,
        });
        return NextResponse.json({ error: "Curso no publicable", missing }, { status: 400 });
      }

      result = await prisma.course.create({
        data: {
          slug, title, description,
          learningObjectives: learningObjectives || null,
          targetAudience: targetAudience || null,
          requirements: requirements || null,
          competencies: competencies || null,
          estimatedHours: estimatedHours ? Number(estimatedHours) : null,
          weeklyHours: weeklyHours ? Number(weeklyHours) : null,
          level: level || null,
          language: language || "es",
          certificateAvailable: certificateAvailable !== undefined ? Boolean(certificateAvailable) : true,
          selfPaced: selfPaced !== undefined ? Boolean(selfPaced) : true,
          pricingModel: pricingModel || "FREE",
          price: nextPrice,
          currency: currency || "USD",
          visibility: visibility || "PUBLIC",
          status: nextStatus,
          instructorId: session.userId,
          editions: {
            create: {
              name: { es: "Edición inicial", en: "Initial edition" },
              status: "PUBLISHED",
              isDefault: true,
            },
          },
        },
      });
    }

    return NextResponse.json({ data: result }, { status: id ? 200 : 201 });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
