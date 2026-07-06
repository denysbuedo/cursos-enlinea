-- Add question bank and evaluation randomization controls
ALTER TABLE "Course" ADD COLUMN "questionBank" JSONB;

ALTER TABLE "Evaluation" ADD COLUMN "shuffleQuestions" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Evaluation" ADD COLUMN "shuffleOptions" BOOLEAN NOT NULL DEFAULT true;
