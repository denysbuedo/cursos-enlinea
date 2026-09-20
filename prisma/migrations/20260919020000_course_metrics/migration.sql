ALTER TABLE "Course"
ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "uniqueVisitorCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "CourseVisit" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "visitCount" INTEGER NOT NULL DEFAULT 1,
    "firstVisitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVisitedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseVisit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseVisit_courseId_visitorId_key" ON "CourseVisit"("courseId", "visitorId");
CREATE INDEX "CourseVisit_courseId_idx" ON "CourseVisit"("courseId");

ALTER TABLE "CourseVisit" ADD CONSTRAINT "CourseVisit_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
