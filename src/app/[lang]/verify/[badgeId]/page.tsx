import { prisma } from "@/lib/prisma";

export default async function VerifyBadgePage({
  params,
}: {
  params: Promise<{ badgeId: string }>;
}) {
  const { badgeId } = await params;
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
    return (
      <div className="container mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-black">Certificado no encontrado</h1>
        <p className="mt-2 text-[#7b8fa1]">El badge {badgeId} no existe en nuestros registros.</p>
      </div>
    );
  }

  const courseTitle =
    (certificate.enrollment.course.title as { es: string })?.es ||
    (certificate.enrollment.course.title as { en: string })?.en ||
    "";
  const studentName = certificate.enrollment.user.name;

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <div className={`rounded-xl border p-8 ${certificate.isRevoked ? "border-[#c0392b] bg-[#c0392b]/5" : "border-[#b9f8cf] bg-[#f0fdf4]"}`}>
        <h1 className="text-2xl font-bold mb-2">
          {certificate.isRevoked ? "Certificado revocado" : "Certificado válido"}
        </h1>
        <div className="space-y-2 mt-6">
          <p><strong>Estudiante:</strong> {studentName}</p>
          <p><strong>Curso:</strong> {courseTitle}</p>
          <p><strong>Emitido:</strong> {new Date(certificate.issuedAt).toLocaleDateString("es-ES", { dateStyle: "long" })}</p>
          <p><strong>Badge ID:</strong> {badgeId}</p>
          <p><strong>Criterio:</strong> {certificate.criteriaNarrative}</p>
          {certificate.isRevoked && (
            <p className="text-black"><strong>Razón de revocación:</strong> {certificate.revocationReason || "No especificada"}</p>
          )}
        </div>
        <p className="mt-6 text-sm text-[#7b8fa1]">
          Este certificado cumple el estándar Open Badges 3.0 y W3C Verifiable Credentials. Verificado criptográficamente con EdDSA.
        </p>
      </div>
    </div>
  );
}
