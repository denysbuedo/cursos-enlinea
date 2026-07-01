import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ badgeId: string }> }
) {
  const { badgeId } = await params;

  // Si es un navegador (Accept: text/html), redirigir a la página HTML
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    const lang = request.cookies.get("NEXT_LOCALE")?.value || "es";
    return NextResponse.redirect(
      new URL(`/${lang}/verify/${badgeId}`, request.url)
    );
  }

  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await rateLimit(`verify:${ip}`, RATE_LIMITS.VERIFY);
  if (!success) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const certificate = await prisma.certificate.findUnique({
    where: { badgeId },
    include: {
      enrollment: {
        select: {
          user: { select: { name: true } },
          course: { select: { title: true, slug: true } },
        },
      },
    },
  });

  if (!certificate) {
    return NextResponse.json(
      { valid: false, error: "Certificate not found" },
      { status: 404, headers: { "Content-Type": "application/ld+json" } }
    );
  }

  // Reconstruir el credential completo con @context, type, proof
  // El issuerProfile contiene los metadatos del emisor
  const issuerProfile = certificate.issuerProfile as Record<string, unknown> | null;
  const issuerId = (issuerProfile as Record<string, unknown>)?.id || "";
  const issuerName = (issuerProfile as Record<string, unknown>)?.name || "EdPlatform";
  const issuerUrl = (issuerProfile as Record<string, unknown>)?.url || "";

  const credentialSubject = certificate.credentialSubject as Record<string, unknown>;

  // Construir el credential conforme a Open Badges 3.0 / W3C VC
  const credential = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: certificate.verificationUrl,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      id: issuerId,
      name: issuerName,
      url: issuerUrl,
    },
    validFrom: certificate.issuedAt,
    credentialSubject,
    proof: {
      type: "DataIntegrityProof",
      cryptosuite: "eddsa-rdfc-2022",
      created: certificate.issuedAt,
      verificationMethod: `${issuerId}#key-1`,
      proofPurpose: "assertionMethod",
    },
  };

  return NextResponse.json(
    {
      valid: !certificate.isRevoked,
      revoked: certificate.isRevoked,
      revocationReason: certificate.revocationReason,
      issuedTo: certificate.enrollment.user.name,
      course:
        (certificate.enrollment.course.title as { es?: string })?.es ||
        (certificate.enrollment.course.title as { en?: string })?.en,
      issuedAt: certificate.issuedAt,
      badgeId: certificate.badgeId,
      credential,
    },
    {
      headers: { "Content-Type": "application/ld+json" },
    }
  );
}
