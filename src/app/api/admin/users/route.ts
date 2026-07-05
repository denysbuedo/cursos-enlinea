import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireAuth } from "@/lib/auth";

// GET /api/admin/users — Listar usuarios
export async function GET(request: NextRequest) {
  try {
    await requireAuth("ADMIN");
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

    const where: Record<string, unknown> = {};
    if (role && ["ADMIN", "INSTRUCTOR", "STUDENT"].includes(role)) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, country: true, preferredLang: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ data: users, total, page, pageSize });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      if (e.message === "FORBIDDEN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth("ADMIN");
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    const role = body.role || "STUDENT";
    const country = body.country ? String(body.country).trim().toUpperCase() : null;
    const preferredLang = body.preferredLang === "en" ? "en" : "es";

    if (!email || !name || password.length < 6 || !["ADMIN", "INSTRUCTOR", "STUDENT"].includes(role)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, name, passwordHash, role, country, preferredLang },
      select: { id: true, name: true, email: true, role: true, country: true, preferredLang: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: {
        action: "USER_CREATED_BY_ADMIN",
        entity: "User",
        entityId: user.id,
        userId,
        metadata: { email: user.email, role: user.role },
      },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      if (e.message === "FORBIDDEN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
