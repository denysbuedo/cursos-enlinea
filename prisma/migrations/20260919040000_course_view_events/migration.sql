CREATE TABLE "CourseViewEvent" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseViewEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CourseViewEvent_courseId_viewedAt_idx" ON "CourseViewEvent"("courseId", "viewedAt");

ALTER TABLE "CourseViewEvent" ADD CONSTRAINT "CourseViewEvent_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
