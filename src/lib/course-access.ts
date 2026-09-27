import { prisma } from "@/lib/prisma";

export async function getCourseAssignment(courseId: string, userId: string) {
  return prisma.courseInstructor.findUnique({
    where: { courseId_userId: { courseId, userId } },
    select: { role: true },
  });
}

export async function canManageCourse(courseId: string, userId: string, role: string) {
  if (role === "ADMIN") return true;

  // El responsable principal se guarda en Course.instructorId. Los
  // instructores adicionales se guardan en CourseInstructor.
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  if (course?.instructorId === userId) return true;

  const assignment = await getCourseAssignment(courseId, userId);
  return Boolean(assignment);
}

export async function canViewCourseInCms(courseId: string, userId: string, role: string) {
  if (role === "ADMIN") return true;
  return canManageCourse(courseId, userId, role);
}
