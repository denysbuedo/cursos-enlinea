import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { canManageCourse } from "@/lib/course-access";

type EnrollmentWithSignals = {
  id: string;
  status: string;
  progress: number;
  editionId: string | null;
  certificate: { id: string; isRevoked: boolean } | null;
  evalAttempts: Array<{ score: number; passed: boolean }>;
};

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;
}

function percent(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function summarize(enrollments: EnrollmentWithSignals[]) {
  const active = enrollments.filter((enrollment) => enrollment.status === "ACTIVE");
  const completed = active.filter((enrollment) => enrollment.progress >= 100);
  const passed = active.filter((enrollment) => enrollment.evalAttempts.some((attempt) => attempt.passed));
  const certificates = active.filter((enrollment) => enrollment.certificate && !enrollment.certificate.isRevoked);
  const revokedCertificates = active.filter((enrollment) => enrollment.certificate?.isRevoked);
  const bestScores = active
    .map((enrollment) => Math.max(...enrollment.evalAttempts.map((attempt) => attempt.score), -1))
    .filter((score) => score >= 0);

  return {
    totalEnrollments: enrollments.length,
    activeEnrollments: active.length,
    pendingPayment: enrollments.filter((enrollment) => enrollment.status === "PENDING_PAYMENT").length,
    suspended: enrollments.filter((enrollment) => enrollment.status === "SUSPENDED").length,
    cancelled: enrollments.filter((enrollment) => enrollment.status === "CANCELLED").length,
    averageProgress: average(active.map((enrollment) => enrollment.progress)),
    completed: completed.length,
    completionRate: percent(completed.length, active.length),
    passedEvaluations: passed.length,
    passRate: percent(passed.length, active.length),
    certificatesIssued: certificates.length,
    certificateRate: percent(certificates.length, active.length),
    revokedCertificates: revokedCertificates.length,
    evaluationAttempts: active.reduce((total, enrollment) => total + enrollment.evalAttempts.length, 0),
    averageBestScore: average(bestScores),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await params;
    const course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: {
        id: true,
        instructorId: true,
        viewCount: true,
        uniqueVisitorCount: true,
        editions: {
          orderBy: [{ isDefault: "desc" }, { startsAt: "asc" }, { createdAt: "asc" }],
          select: { id: true, name: true, startsAt: true, endsAt: true, capacity: true, status: true, isDefault: true },
        },
      },
    });

    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    if (!(await canManageCourse(course.id, session.userId, session.role))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const [enrollments, viewEvents] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId: course.id },
        select: {
          id: true,
          status: true,
          progress: true,
          editionId: true,
          certificate: { select: { id: true, isRevoked: true } },
          evalAttempts: { select: { score: true, passed: true } },
        },
      }),
      prisma.courseViewEvent.findMany({
        where: {
          courseId: course.id,
          viewedAt: { gte: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000) },
        },
        select: { viewedAt: true },
        orderBy: { viewedAt: "asc" },
      }),
    ]);

    const overall = summarize(enrollments);
    const editionMetrics = course.editions.map((edition) => {
      const editionEnrollments = enrollments.filter((enrollment) => enrollment.editionId === edition.id);
      return {
        edition,
        ...summarize(editionEnrollments),
      };
    });

    const withoutEdition = enrollments.filter((enrollment) => !enrollment.editionId);
    const viewsByDayMap = new Map<string, number>();
    for (const event of viewEvents) {
      const day = event.viewedAt.toISOString().slice(0, 10);
      viewsByDayMap.set(day, (viewsByDayMap.get(day) || 0) + 1);
    }
    const viewsByDay = Array.from({ length: 30 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (29 - index));
      const day = date.toISOString().slice(0, 10);
      return { day, views: viewsByDayMap.get(day) || 0 };
    });

    return NextResponse.json({
      data: {
        overall,
        editions: editionMetrics,
        withoutEdition: withoutEdition.length > 0 ? summarize(withoutEdition) : null,
        views: {
          total: course.viewCount,
          unique: course.uniqueVisitorCount,
          byDay: viewsByDay,
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
