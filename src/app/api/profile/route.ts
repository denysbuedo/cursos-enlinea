import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAuth();
    const profile = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, bio: true, institution: true, avatarUrl: true },
    });
    return profile
      ? NextResponse.json({ data: profile })
      : NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 2000) : null;
    const institution = typeof body.institution === "string" ? body.institution.trim().slice(0, 200) : null;
    const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim().slice(0, 1000) : null;

    const profile = await prisma.user.update({
      where: { id: session.userId },
      data: { bio: bio || null, institution: institution || null, avatarUrl: avatarUrl || null },
      select: { id: true, name: true, email: true, bio: true, institution: true, avatarUrl: true },
    });
    return NextResponse.json({ data: profile });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar el perfil" }, { status: 500 });
  }
}
