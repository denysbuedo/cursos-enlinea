import { prisma } from "@/lib/prisma";

export async function getCourseAssignment(courseId: string, userId: string) {
  return prisma.courseInstructor.findUnique({
    where: { courseId_userId: { courseId, userId } },
    select: { role: true },
  });
}

export async function canManageCourse(courseId: string, userId: string, role: string) {
  if (role === "ADMIN") return true;

  const assignment = await getCourseAssignment(courseId, userId);
  return Boolean(assignment);
}

export async function canViewCourseInCms(courseId: string, userId: string, role: string) {
  if (role === "ADMIN") return true;
  const assignment = await getCourseAssignment(courseId, userId);
  return Boolean(assignment);
}
