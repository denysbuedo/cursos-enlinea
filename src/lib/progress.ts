import { prisma } from "@/lib/prisma";

export async function calculateEnrollmentProgress(enrollmentId: string, courseId: string) {
  const [totalSessions, completedSessions] = await Promise.all([
    prisma.session.count({
      where: { courseId, status: "PUBLISHED" },
    }),
    prisma.sessionCompletion.count({
      where: {
        enrollmentId,
        session: {
          courseId,
          status: "PUBLISHED",
        },
      },
    }),
  ]);

  const progress = totalSessions > 0
    ? Math.round((completedSessions / totalSessions) * 100 * 10) / 10
    : 0;

  return { progress, completedSessions, totalSessions };
}
