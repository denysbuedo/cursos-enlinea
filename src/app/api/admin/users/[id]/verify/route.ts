import { NextResponse } from "next/server";
import { AuthTokenType } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuth("ADMIN");
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, emailVerifiedAt: true },
    });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const verifiedAt = user.emailVerifiedAt || new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: verifiedAt },
        select: { id: true, name: true, email: true, role: true, emailVerifiedAt: true },
      });
      await tx.authToken.deleteMany({ where: { userId: user.id, type: AuthTokenType.EMAIL_VERIFICATION } });
      await tx.auditLog.create({
        data: {
          action: "ADMIN_EMAIL_VERIFICATION_OVERRIDE",
          entity: "User",
          entityId: user.id,
          userId: admin.userId,
          metadata: { email: user.email, alreadyVerified: Boolean(user.emailVerifiedAt) },
        },
      });
      return result;
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    return NextResponse.json({ error: "No se pudo confirmar el correo" }, { status: 500 });
  }
}
