import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

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
        editions: {
          orderBy: [{ isDefault: "desc" }, { startsAt: "asc" }, { createdAt: "asc" }],
          select: { id: true, name: true, startsAt: true, endsAt: true, capacity: true, status: true, isDefault: true },
        },
      },
    });

    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    if (session.role !== "ADMIN" && course.instructorId !== session.userId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: course.id },
      select: {
        id: true,
        status: true,
        progress: true,
        editionId: true,
        certificate: { select: { id: true, isRevoked: true } },
        evalAttempts: { select: { score: true, passed: true } },
      },
    });

    const overall = summarize(enrollments);
    const editionMetrics = course.editions.map((edition) => {
      const editionEnrollments = enrollments.filter((enrollment) => enrollment.editionId === edition.id);
      return {
        edition,
        ...summarize(editionEnrollments),
      };
    });

    const withoutEdition = enrollments.filter((enrollment) => !enrollment.editionId);

    return NextResponse.json({
      data: {
        overall,
        editions: editionMetrics,
        withoutEdition: withoutEdition.length > 0 ? summarize(withoutEdition) : null,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
