import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ImportedSession = Record<string, unknown>;
type ImportedModule = { title: unknown; description?: unknown; order?: number; status?: string; sessions?: ImportedSession[] };
type ImportedCourse = Record<string, unknown>;
type ImportedInstructor = { email?: unknown; role?: unknown };
type ImportedSessionType = "RECORDED" | "LIVE" | "HYBRID";

function text(value: unknown, fallback: { es: string; en: string } = { es: "", en: "" }): { es: string; en: string } {
  if (value && typeof value === "object" && "es" in value && "en" in value) {
    return { es: String(value.es), en: String(value.en) };
  }
  return fallback;
}

function jsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  return value === null || value === undefined ? undefined : value as Prisma.InputJsonValue;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const contentType = request.headers.get("content-type") || "";
    let payload: Record<string, unknown>;
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo JSON" }, { status: 400 });
      payload = JSON.parse(await file.text());
    } else {
      payload = await request.json();
    }

    if (payload.format !== "cursos-enlinea-mooc" || payload.formatVersion !== 1 || !payload.course || typeof payload.course !== "object") {
      return NextResponse.json({ error: "Archivo de curso no válido o versión no compatible" }, { status: 400 });
    }
    const source = payload.course as ImportedCourse;
    if (!source.slug || !source.title || !source.description) return NextResponse.json({ error: "El archivo no contiene la ficha básica" }, { status: 400 });

    const baseSlug = String(source.slug).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "curso-importado";
    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.course.findUnique({ where: { slug }, select: { id: true } })) slug = `${baseSlug}-importado-${suffix++}`;
    const currentUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });

    const imported = await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          slug,
          title: text(source.title),
          description: text(source.description),
          learningObjectives: jsonValue(source.learningObjectives),
          targetAudience: jsonValue(source.targetAudience),
          requirements: jsonValue(source.requirements),
          competencies: jsonValue(source.competencies),
          coverImageUrl: typeof source.coverImageUrl === "string" ? source.coverImageUrl : null,
          scienceBranch: typeof source.scienceBranch === "string" ? source.scienceBranch : null,
          topics: Array.isArray(source.topics) ? source.topics.map(String) : [],
          keywords: Array.isArray(source.keywords) ? source.keywords.map(String) : [],
          questionBank: jsonValue(source.questionBank),
          estimatedHours: source.estimatedHours ? Number(source.estimatedHours) : null,
          weeklyHours: source.weeklyHours ? Number(source.weeklyHours) : null,
          level: typeof source.level === "string" ? source.level : null,
          language: typeof source.language === "string" ? source.language : "es",
          certificateAvailable: source.certificateAvailable !== false,
          selfPaced: source.selfPaced !== false,
          pricingModel: source.pricingModel === "PAID" ? "PAID" : "FREE",
          price: source.pricingModel === "PAID" && source.price ? Number(source.price) : null,
          currency: typeof source.currency === "string" && ["CUP", "USD", "EUR"].includes(source.currency) ? source.currency as "CUP" | "USD" | "EUR" : "USD",
          status: "DRAFT",
          visibility: "PRIVATE",
          instructorId: session.userId,
        },
      });

      await tx.courseInstructor.create({ data: { courseId: course.id, userId: session.userId, role: "LEAD" } });

      const importedInstructors = Array.isArray(source.instructors) ? source.instructors as ImportedInstructor[] : [];
      for (const instructor of importedInstructors) {
        if (!instructor || instructor.email === currentUser?.email || !instructor.email) continue;
        const user = await tx.user.findUnique({ where: { email: String(instructor.email).toLowerCase() }, select: { id: true, role: true } });
        if (user?.role === "INSTRUCTOR") {
          await tx.courseInstructor.create({ data: { courseId: course.id, userId: user.id, role: instructor.role === "EDITOR" ? "EDITOR" : "INSTRUCTOR" } });
        }
      }

      const editions = Array.isArray(source.editions) ? source.editions : [];
      if (editions.length === 0) {
        await tx.courseEdition.create({ data: { courseId: course.id, name: { es: "Edición importada", en: "Imported edition" }, status: "DRAFT", isDefault: true } });
      } else {
        for (const edition of editions) {
          await tx.courseEdition.create({ data: { courseId: course.id, name: text(edition.name, { es: "Edición importada", en: "Imported edition" }), startsAt: edition.startsAt ? new Date(edition.startsAt) : null, endsAt: edition.endsAt ? new Date(edition.endsAt) : null, capacity: edition.capacity ? Number(edition.capacity) : null, status: "DRAFT", isDefault: Boolean(edition.isDefault) } });
        }
      }

      const modules = Array.isArray(source.modules) ? source.modules as ImportedModule[] : [];
      for (const courseModule of modules) {
        const createdModule = await tx.courseModule.create({ data: { courseId: course.id, title: text(courseModule.title), description: jsonValue(courseModule.description), order: Number(courseModule.order || 1), status: "DRAFT" } });
        for (const sessionData of courseModule.sessions || []) {
          const sessionType = ["RECORDED", "LIVE", "HYBRID"].includes(String(sessionData.sessionType)) ? String(sessionData.sessionType) as ImportedSessionType : "RECORDED";
          await tx.session.create({ data: { courseId: course.id, moduleId: createdModule.id, title: text(sessionData.title), description: text(sessionData.description), keywords: Array.isArray(sessionData.keywords) ? sessionData.keywords.map(String) : [], sessionType, preview: Boolean(sessionData.preview), videoUrl: typeof sessionData.videoUrl === "string" ? sessionData.videoUrl : null, videoPlatform: typeof sessionData.videoPlatform === "string" ? sessionData.videoPlatform : null, durationMinutes: sessionData.durationMinutes ? Number(sessionData.durationMinutes) : null, resources: jsonValue(sessionData.resources), practicePrompt: jsonValue(sessionData.practicePrompt), scheduledAt: sessionData.scheduledAt ? new Date(String(sessionData.scheduledAt)) : null, order: Number(sessionData.order || 1), status: "DRAFT" } });
        }
      }

      for (const sessionData of (Array.isArray(source.sessions) ? source.sessions : []) as ImportedSession[]) {
        const sessionType = ["RECORDED", "LIVE", "HYBRID"].includes(String(sessionData.sessionType)) ? String(sessionData.sessionType) as ImportedSessionType : "RECORDED";
        await tx.session.create({ data: { courseId: course.id, title: text(sessionData.title), description: text(sessionData.description), keywords: Array.isArray(sessionData.keywords) ? sessionData.keywords.map(String) : [], sessionType, preview: Boolean(sessionData.preview), videoUrl: typeof sessionData.videoUrl === "string" ? sessionData.videoUrl : null, videoPlatform: typeof sessionData.videoPlatform === "string" ? sessionData.videoPlatform : null, durationMinutes: sessionData.durationMinutes ? Number(sessionData.durationMinutes) : null, resources: jsonValue(sessionData.resources), practicePrompt: jsonValue(sessionData.practicePrompt), scheduledAt: sessionData.scheduledAt ? new Date(String(sessionData.scheduledAt)) : null, order: Number(sessionData.order || 1), status: "DRAFT" } });
      }

      if (source.evaluation && typeof source.evaluation === "object") {
        const evaluation = source.evaluation as ImportedCourse;
        await tx.evaluation.create({ data: { courseId: course.id, title: text(evaluation.title, { es: "Evaluación final", en: "Final evaluation" }), description: jsonValue(evaluation.description), passingScore: Number(evaluation.passingScore || 80), maxAttempts: Number(evaluation.maxAttempts || 3), showFeedback: evaluation.showFeedback !== false, shuffleQuestions: evaluation.shuffleQuestions !== false, shuffleOptions: evaluation.shuffleOptions !== false, questions: jsonValue(Array.isArray(evaluation.questions) ? evaluation.questions : []) || [] } });
      }
      return course;
    });

    return NextResponse.json({ data: imported, message: "Curso importado como borrador" }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    return NextResponse.json({ error: "No se pudo importar el curso" }, { status: 500 });
  }
}
