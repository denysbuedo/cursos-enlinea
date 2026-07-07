-- Prevent the same user from being enrolled more than once in the same course edition.
CREATE UNIQUE INDEX "Enrollment_userId_courseId_editionId_key"
ON "Enrollment"("userId", "courseId", "editionId");
