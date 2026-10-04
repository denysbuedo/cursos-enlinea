-- Support final, partial and formative assessments associated with modules or sessions.
CREATE TYPE "EvaluationType" AS ENUM ('FINAL', 'PARTIAL', 'AUTOEVALUATION');

ALTER TABLE "Evaluation"
  ADD COLUMN "moduleId" TEXT,
  ADD COLUMN "sessionId" TEXT,
  ADD COLUMN "evaluationType" "EvaluationType" NOT NULL DEFAULT 'FINAL';

DROP INDEX IF EXISTS "Evaluation_courseId_key";

CREATE INDEX "Evaluation_courseId_evaluationType_idx" ON "Evaluation"("courseId", "evaluationType");
CREATE INDEX "Evaluation_sessionId_idx" ON "Evaluation"("sessionId");
CREATE INDEX "Evaluation_moduleId_idx" ON "Evaluation"("moduleId");

ALTER TABLE "Evaluation"
  ADD CONSTRAINT "Evaluation_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Evaluation"
  ADD CONSTRAINT "Evaluation_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
