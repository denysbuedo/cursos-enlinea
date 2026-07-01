import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// POST /api/admin/users/[id]/role — Cambiar rol de usuario
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth("ADMIN");
    const { id } = await params;
    const { role } = await request.json();

    if (!["ADMIN", "INSTRUCTOR", "STUDENT"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        action: "USER_ROLE_CHANGED",
        entity: "User",
        entityId: id,
        userId: user.id,
        metadata: { newRole: role, userName: user.name },
      },
    });

    return NextResponse.json({ data: user });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      if (e.message === "FORBIDDEN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
