import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// POST /api/enrollments
// Body: { courseSlug }
// Crea una matrícula: para cursos gratis se activa inmediatamente,
// para cursos de pago se crea en estado PENDING_PAYMENT
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const { courseSlug, editionId } = await request.json();

    if (!courseSlug) {
      return NextResponse.json(
        { error: "Falta el slug del curso" },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
    });

    if (!course || course.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Curso no encontrado o no disponible" },
        { status: 404 }
      );
    }

    const selectedEdition = editionId
      ? await prisma.courseEdition.findFirst({
          where: { id: editionId, courseId: course.id, status: "PUBLISHED" },
        })
      : await prisma.courseEdition.findFirst({
          where: { courseId: course.id, status: "PUBLISHED" },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        });

    if (editionId && !selectedEdition) {
      return NextResponse.json(
        { error: "Edición no encontrada o no disponible" },
        { status: 404 }
      );
    }

    if (selectedEdition?.capacity) {
      const enrollmentCount = await prisma.enrollment.count({
        where: {
          editionId: selectedEdition.id,
          status: { in: ["ACTIVE", "PENDING_PAYMENT"] },
        },
      });
      if (enrollmentCount >= selectedEdition.capacity) {
        return NextResponse.json(
          { error: "La edición seleccionada no tiene cupos disponibles" },
          { status: 409 }
        );
      }
    }

    // Verificar que no esté ya matriculado en esta edición
    const existing = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: course.id,
        editionId: selectedEdition?.id || null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya estás matriculado en este curso", enrollment: existing },
        { status: 409 }
      );
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId: course.id,
        editionId: selectedEdition?.id,
        status: course.pricingModel === "FREE" ? "ACTIVE" : "PENDING_PAYMENT",
        admissionType: course.pricingModel === "FREE" ? "CALL_SYSTEM" : "COMMERCIAL",
      },
      include: { course: true },
    });

    return NextResponse.json({ data: enrollment }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 401 }
        );
      }
    }
    return NextResponse.json(
      { error: "Error al crear la matrícula" },
      { status: 500 }
    );
  }
}
