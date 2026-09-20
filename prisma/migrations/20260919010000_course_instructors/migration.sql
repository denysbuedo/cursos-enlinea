CREATE TYPE "CourseInstructorRole" AS ENUM ('LEAD', 'INSTRUCTOR', 'EDITOR');

CREATE TABLE "CourseInstructor" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CourseInstructorRole" NOT NULL DEFAULT 'INSTRUCTOR',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseInstructor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseInstructor_courseId_userId_key" ON "CourseInstructor"("courseId", "userId");
CREATE INDEX "CourseInstructor_userId_idx" ON "CourseInstructor"("userId");

ALTER TABLE "CourseInstructor" ADD CONSTRAINT "CourseInstructor_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseInstructor" ADD CONSTRAINT "CourseInstructor_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CourseInstructor" ("id", "courseId", "userId", "role")
SELECT gen_random_uuid()::text, "id", "instructorId", 'LEAD'::"CourseInstructorRole"
FROM "Course";
