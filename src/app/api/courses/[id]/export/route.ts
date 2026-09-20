import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canManageCourse } from "@/lib/course-access";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        instructor: { select: { name: true, email: true } },
        instructors: { select: { role: true, user: { select: { name: true, email: true } } } },
        editions: { orderBy: [{ isDefault: "desc" }, { startsAt: "asc" }] },
        modules: {
          orderBy: { order: "asc" },
          include: { sessions: { orderBy: { order: "asc" } } },
        },
        sessions: { where: { moduleId: null }, orderBy: { order: "asc" } },
        evaluations: { take: 1 },
      },
    });
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    if (!(await canManageCourse(course.id, session.userId, session.role))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const exported = {
      format: "cursos-enlinea-mooc",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      course: {
        slug: course.slug,
        title: course.title,
        description: course.description,
        learningObjectives: course.learningObjectives,
        targetAudience: course.targetAudience,
        requirements: course.requirements,
        competencies: course.competencies,
        coverImageUrl: course.coverImageUrl,
        scienceBranch: course.scienceBranch,
        topics: course.topics,
        keywords: course.keywords,
        estimatedHours: course.estimatedHours,
        weeklyHours: course.weeklyHours,
        level: course.level,
        language: course.language,
        certificateAvailable: course.certificateAvailable,
        selfPaced: course.selfPaced,
        pricingModel: course.pricingModel,
        price: course.price?.toString() || null,
        currency: course.currency,
        instructors: [
          { name: course.instructor.name, email: course.instructor.email, role: "LEAD" },
          ...course.instructors.filter((assignment) => assignment.user.email !== course.instructor.email).map((assignment) => ({
            name: assignment.user.name,
            email: assignment.user.email,
            role: assignment.role,
          })),
        ],
        editions: course.editions.map((edition) => ({
          name: edition.name,
          startsAt: edition.startsAt,
          endsAt: edition.endsAt,
          capacity: edition.capacity,
          status: edition.status,
          isDefault: edition.isDefault,
        })),
        modules: course.modules.map((module) => ({
          title: module.title,
          description: module.description,
          order: module.order,
          status: module.status,
          sessions: module.sessions.map((sessionItem) => ({
            title: sessionItem.title,
            description: sessionItem.description,
            keywords: sessionItem.keywords,
            sessionType: sessionItem.sessionType,
            preview: sessionItem.preview,
            videoUrl: sessionItem.videoUrl,
            videoPlatform: sessionItem.videoPlatform,
            durationMinutes: sessionItem.durationMinutes,
            resources: sessionItem.resources,
            practicePrompt: sessionItem.practicePrompt,
            scheduledAt: sessionItem.scheduledAt,
            order: sessionItem.order,
            status: sessionItem.status,
          })),
        })),
        sessions: course.sessions.map((sessionItem) => ({
          title: sessionItem.title,
          description: sessionItem.description,
          keywords: sessionItem.keywords,
          sessionType: sessionItem.sessionType,
          preview: sessionItem.preview,
          videoUrl: sessionItem.videoUrl,
          videoPlatform: sessionItem.videoPlatform,
          durationMinutes: sessionItem.durationMinutes,
          resources: sessionItem.resources,
          practicePrompt: sessionItem.practicePrompt,
          scheduledAt: sessionItem.scheduledAt,
          order: sessionItem.order,
          status: sessionItem.status,
        })),
        evaluation: course.evaluations[0] ? {
          title: course.evaluations[0].title,
          description: course.evaluations[0].description,
          passingScore: course.evaluations[0].passingScore,
          maxAttempts: course.evaluations[0].maxAttempts,
          showFeedback: course.evaluations[0].showFeedback,
          shuffleQuestions: course.evaluations[0].shuffleQuestions,
          shuffleOptions: course.evaluations[0].shuffleOptions,
          questions: course.evaluations[0].questions,
        } : null,
        questionBank: course.questionBank,
      },
    };

    return new NextResponse(JSON.stringify(exported, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${course.slug}-mooc.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    return NextResponse.json({ error: "No se pudo exportar el curso" }, { status: 500 });
  }
}
