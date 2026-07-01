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

    const { courseSlug } = await request.json();

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

    // Verificar que no esté ya matriculado
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
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
