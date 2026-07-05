-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('CUP', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ENZONA', 'TRANSFERMOVIL', 'BANK_TRANSFER_CUP', 'BANK_TRANSFER_INTL', 'CRYPTO_USDT', 'CRYPTO_USDC', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'ENROLLED_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('RECORDED', 'LIVE', 'HYBRID');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'INSTRUCTOR', 'STUDENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "country" TEXT,
    "preferredLang" TEXT NOT NULL DEFAULT 'es',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "learningObjectives" JSONB,
    "targetAudience" JSONB,
    "requirements" JSONB,
    "competencies" JSONB,
    "estimatedHours" INTEGER,
    "weeklyHours" INTEGER,
    "level" TEXT,
    "language" TEXT NOT NULL DEFAULT 'es',
    "certificateAvailable" BOOLEAN NOT NULL DEFAULT true,
    "selfPaced" BOOLEAN NOT NULL DEFAULT true,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "pricingModel" TEXT NOT NULL DEFAULT 'FREE',
    "price" DECIMAL(10,2),
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "instructorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseEdition" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "capacity" INTEGER,
    "status" "CourseStatus" NOT NULL DEFAULT 'PUBLISHED',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseModule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB,
    "order" INTEGER NOT NULL,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "moduleId" TEXT,
    "title" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "keywords" TEXT[],
    "sessionType" "SessionType" NOT NULL DEFAULT 'RECORDED',
    "preview" BOOLEAN NOT NULL DEFAULT false,
    "videoUrl" TEXT,
    "videoPlatform" TEXT,
    "durationMinutes" INTEGER,
    "resources" JSONB,
    "practicePrompt" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "editionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "admissionType" TEXT NOT NULL DEFAULT 'COMMERCIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "amountReference" TEXT,
    "enzonaTxId" TEXT,
    "cryptoAddress" TEXT,
    "cryptoTxHash" TEXT,
    "bankReference" TEXT,
    "proofUrl" TEXT,
    "userIp" TEXT,
    "userCountry" TEXT,
    "notes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentInstruction" (
    "id" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "currency" "Currency" NOT NULL,
    "label" JSONB NOT NULL,
    "instructions" JSONB NOT NULL,
    "accountInfo" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "geoRestriction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentInstruction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "verificationUrl" TEXT NOT NULL,
    "credentialSubject" JSONB NOT NULL,
    "issuerProfile" JSONB NOT NULL,
    "criteriaNarrative" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "imageBadgeUrl" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revocationReason" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionCompletion" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB,
    "passingScore" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "showFeedback" BOOLEAN NOT NULL DEFAULT true,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationAttempt" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_slug_status_idx" ON "Course"("slug", "status");

-- CreateIndex
CREATE INDEX "Course_instructorId_idx" ON "Course"("instructorId");

-- CreateIndex
CREATE INDEX "CourseEdition_courseId_status_idx" ON "CourseEdition"("courseId", "status");

-- CreateIndex
CREATE INDEX "CourseEdition_courseId_isDefault_idx" ON "CourseEdition"("courseId", "isDefault");

-- CreateIndex
CREATE INDEX "CourseModule_courseId_order_idx" ON "CourseModule"("courseId", "order");

-- CreateIndex
CREATE INDEX "Session_courseId_order_idx" ON "Session"("courseId", "order");

-- CreateIndex
CREATE INDEX "Session_moduleId_order_idx" ON "Session"("moduleId", "order");

-- CreateIndex
CREATE INDEX "Session_preview_idx" ON "Session"("preview");

-- CreateIndex
CREATE INDEX "Enrollment_userId_idx" ON "Enrollment"("userId");

-- CreateIndex
CREATE INDEX "Enrollment_courseId_status_idx" ON "Enrollment"("courseId", "status");

-- CreateIndex
CREATE INDEX "Enrollment_editionId_idx" ON "Enrollment"("editionId");

-- CreateIndex
CREATE INDEX "Payment_status_currency_idx" ON "Payment"("status", "currency");

-- CreateIndex
CREATE INDEX "Payment_enrollmentId_idx" ON "Payment"("enrollmentId");

-- CreateIndex
CREATE INDEX "Payment_cryptoTxHash_idx" ON "Payment"("cryptoTxHash");

-- CreateIndex
CREATE INDEX "PaymentInstruction_isActive_idx" ON "PaymentInstruction"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentInstruction_method_currency_key" ON "PaymentInstruction"("method", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_enrollmentId_key" ON "Certificate"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_badgeId_key" ON "Certificate"("badgeId");

-- CreateIndex
CREATE INDEX "Certificate_studentId_issuedAt_idx" ON "Certificate"("studentId", "issuedAt");

-- CreateIndex
CREATE INDEX "Certificate_courseId_idx" ON "Certificate"("courseId");

-- CreateIndex
CREATE INDEX "Certificate_badgeId_idx" ON "Certificate"("badgeId");

-- CreateIndex
CREATE INDEX "SessionCompletion_enrollmentId_idx" ON "SessionCompletion"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionCompletion_enrollmentId_sessionId_key" ON "SessionCompletion"("enrollmentId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_courseId_key" ON "Evaluation"("courseId");

-- CreateIndex
CREATE INDEX "Evaluation_courseId_idx" ON "Evaluation"("courseId");

-- CreateIndex
CREATE INDEX "EvaluationAttempt_evaluationId_enrollmentId_idx" ON "EvaluationAttempt"("evaluationId", "enrollmentId");

-- CreateIndex
CREATE INDEX "EvaluationAttempt_enrollmentId_idx" ON "EvaluationAttempt"("enrollmentId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEdition" ADD CONSTRAINT "CourseEdition_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "CourseEdition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCompletion" ADD CONSTRAINT "SessionCompletion_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCompletion" ADD CONSTRAINT "SessionCompletion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAttempt" ADD CONSTRAINT "EvaluationAttempt_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAttempt" ADD CONSTRAINT "EvaluationAttempt_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

