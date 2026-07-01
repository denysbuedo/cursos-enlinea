import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { generateOpenBadge } from "@/lib/crypto/badge";
import { randomUUID } from "crypto";

// POST /api/certificates/[enrollmentId]
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id: enrollmentId } = await params;

    // Verificar que el enrollment pertenece al usuario
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            sessions: { where: { status: "PUBLISHED" } },
            evaluations: true,
          },
        },
        user: { select: { name: true, id: true } },
      },
    });

    if (!enrollment || enrollment.userId !== userId) {
      return NextResponse.json(
        { error: "Matrícula no encontrada" },
        { status: 404 }
      );
    }

    // Verificar progreso 100%
    if (enrollment.progress < 100) {
      return NextResponse.json(
        { error: "Debes completar todas las sesiones primero", progress: enrollment.progress },
        { status: 400 }
      );
    }

    // Verificar evaluación aprobada
    const evaluation = enrollment.course.evaluations[0];
    if (!evaluation) {
      return NextResponse.json(
        { error: "Este curso no tiene evaluación configurada" },
        { status: 400 }
      );
    }

    const attempt = await prisma.evaluationAttempt.findFirst({
      where: {
        evaluationId: evaluation.id,
        enrollmentId,
        passed: true,
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "Debes aprobar la evaluación antes de emitir el certificado" },
        { status: 400 }
      );
    }

    // Verificar que no exista ya un certificado
    const existing = await prisma.certificate.findUnique({
      where: { enrollmentId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un certificado emitido", certificate: existing },
        { status: 409 }
      );
    }

    // Generar badgeId único
    const badgeId = `badge-${randomUUID()}`;
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/es/verify/${badgeId}`;
    const issuerUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const courseTitle =
      (enrollment.course.title as { es?: string }).es ||
      (enrollment.course.title as { en?: string }).en ||
      "";

    const courseDescription =
      (enrollment.course.description as { es?: string }).es ||
      (enrollment.course.description as { en?: string }).en ||
      "";

    // Generar Open Badge firmado (si hay clave EdDSA configurada)
    let credentialSubject: Record<string, unknown> = {};
    let issuerProfile: Record<string, unknown> = {};

    try {
      const badge = await generateOpenBadge({
        badgeId,
        studentName: enrollment.user.name,
        studentId: enrollment.user.id,
        courseName: courseTitle,
        courseDescription,
        criteriaNarrative: `Completar el 100% del curso "${courseTitle}" y aprobar la evaluación final con un puntaje mínimo del 80%.`,
        issuerName: process.env.NEXT_PUBLIC_APP_NAME || "EdPlatform",
        issuerUrl,
        verificationUrl,
        issuedAt: new Date(),
      });

      credentialSubject = badge.credentialSubject as Record<string, unknown>;
      issuerProfile = badge.issuer as Record<string, unknown>;
    } catch {
      // Si no hay clave EdDSA configurada, emitir sin firma (modo desarrollo)
      credentialSubject = {
        id: `did:example:${enrollment.user.id}`,
        name: enrollment.user.name,
        achievement: {
          id: `${verificationUrl}#achievement`,
          type: ["Achievement"],
          name: courseTitle,
          description: courseDescription,
        },
      };
      issuerProfile = {
        id: issuerUrl,
        name: process.env.NEXT_PUBLIC_APP_NAME || "EdPlatform",
        url: issuerUrl,
      };
    }

    const certificate = await prisma.certificate.create({
      data: {
        enrollmentId,
        courseId: enrollment.courseId,
        studentId: enrollment.user.id,
        badgeId,
        verificationUrl,
        credentialSubject: credentialSubject as Prisma.JsonObject,
        issuerProfile: issuerProfile as Prisma.JsonObject,
        criteriaNarrative: `Completar el 100% del curso "${courseTitle}" y aprobar la evaluación final.`,
      },
      include: {
        enrollment: {
          select: {
            user: { select: { name: true } },
            course: { select: { title: true, slug: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: certificate }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    console.error("Certificate issuance error:", error);
    return NextResponse.json({ error: "Error al emitir certificado" }, { status: 500 });
  }
}
