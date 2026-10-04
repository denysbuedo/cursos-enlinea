import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { appUrl, sendEmail } from "@/lib/email";
import { hasEditionStarted } from "@/lib/edition-dates";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
}

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

    if (selectedEdition?.startsAt && !hasEditionStarted(selectedEdition.startsAt)) {
      const startDate = selectedEdition.startsAt.toISOString().slice(0, 10);
      return NextResponse.json(
        { error: `La edición comienza el ${startDate}. La matrícula estará disponible a partir de esa fecha.`, code: "EDITION_NOT_STARTED" },
        { status: 409 }
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
      include: {
        course: true,
        edition: true,
        user: { select: { name: true, email: true } },
      },
    });

    const courseTitle = (enrollment.course.title as { es?: string; en?: string }).es || (enrollment.course.title as { es?: string; en?: string }).en || enrollment.course.slug;
    const editionName = enrollment.edition
      ? ((enrollment.edition.name as { es?: string; en?: string }).es || (enrollment.edition.name as { es?: string; en?: string }).en || "")
      : "";
    const isActive = enrollment.status === "ACTIVE";
    const courseUrl = `${appUrl()}/es/courses/${encodeURIComponent(enrollment.course.slug)}`;
    void sendEmail({
      to: enrollment.user.email,
      subject: isActive ? `Matrícula confirmada: ${courseTitle}` : `Solicitud de matrícula: ${courseTitle}`,
      text: [
        `Hola ${enrollment.user.name},`,
        isActive ? `Tu matrícula en el curso «${courseTitle}» fue confirmada.` : `Tu solicitud de matrícula en el curso «${courseTitle}» fue registrada y está pendiente de pago o aprobación.`,
        editionName ? `Edición: ${editionName}.` : "",
        `Accede al curso: ${courseUrl}`,
      ].filter(Boolean).join("\n"),
      html: `<p>Hola ${escapeHtml(enrollment.user.name)},</p><p>${isActive ? `Tu matrícula en el curso <strong>${escapeHtml(courseTitle)}</strong> fue confirmada.` : `Tu solicitud de matrícula en el curso <strong>${escapeHtml(courseTitle)}</strong> fue registrada y está pendiente de pago o aprobación.`}</p>${editionName ? `<p>Edición: ${escapeHtml(editionName)}</p>` : ""}<p><a href="${courseUrl}">Acceder al curso</a></p>`,
    }).then((sent) => {
      if (!sent) console.warn(`[enrollment] No se pudo enviar la notificación a ${enrollment.user.email}`);
    }).catch((error) => {
      console.warn("[enrollment] Error enviando notificación", error instanceof Error ? error.message : error);
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
