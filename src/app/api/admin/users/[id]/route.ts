import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuth("ADMIN");
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, _count: { select: { courses: true, courseAssignments: true, enrollments: true, courseReviews: true } } },
    });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    if (user.id === admin.userId) return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 409 });
    if (user.role === "ADMIN") return NextResponse.json({ error: "Las cuentas de administrador no se eliminan desde este panel" }, { status: 409 });

    const certificateCount = await prisma.certificate.count({ where: { studentId: user.id } });
    const paymentCount = await prisma.payment.count({ where: { enrollment: { userId: user.id } } });
    const dependencies = {
      courses: user._count.courses,
      courseAssignments: user._count.courseAssignments,
      enrollments: user._count.enrollments,
      reviews: user._count.courseReviews,
      certificates: certificateCount,
      payments: paymentCount,
    };
    const hasDependencies = Object.values(dependencies).some((count) => count > 0);
    if (hasDependencies) {
      return NextResponse.json({
        error: "No se puede eliminar un usuario con actividad asociada. Archiva o conserva la cuenta para mantener el historial.",
        dependencies,
      }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id: user.id } });
      await tx.auditLog.create({
        data: {
          action: "USER_DELETED_BY_ADMIN",
          entity: "User",
          entityId: user.id,
          userId: admin.userId,
          metadata: { email: user.email, name: user.name, role: user.role },
        },
      });
    });
    return NextResponse.json({ data: { id: user.id, deleted: true } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    return NextResponse.json({ error: "No se pudo eliminar el usuario" }, { status: 500 });
  }
}
