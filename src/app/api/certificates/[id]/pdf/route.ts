import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";

// GET /api/certificates/[id]/pdf
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: {
      enrollment: {
        select: {
          user: { select: { name: true } },
          course: { select: { title: true } },
        },
      },
    },
  });

  if (!certificate || certificate.isRevoked) {
    return NextResponse.json(
      { error: "Certificado no encontrado o revocado" },
      { status: 404 }
    );
  }

  const courseTitle =
    (certificate.enrollment.course.title as { es?: string }).es ||
    (certificate.enrollment.course.title as { en?: string }).en ||
    "";
  const studentName = certificate.enrollment.user.name;

  // Generar PDF
  const doc = new PDFDocument({
    size: "LETTER",
    layout: "landscape",
    margin: 40,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // Borde decorativo
  doc
    .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
    .strokeColor("#3B82F6")
    .lineWidth(3)
    .stroke();

  doc
    .rect(25, 25, doc.page.width - 50, doc.page.height - 50)
    .strokeColor("#93C5FD")
    .lineWidth(1)
    .stroke();

  // Título
  doc
    .fontSize(32)
    .font("Helvetica-Bold")
    .fillColor("#1E40AF")
    .text("CERTIFICADO DE FINALIZACIÓN", { align: "center" });

  doc.moveDown(0.5);
  doc
    .fontSize(14)
    .font("Helvetica")
    .fillColor("#6B7280")
    .text("CERTIFICATE OF COMPLETION", { align: "center" });

  doc.moveDown(2);

  // Cuerpo
  doc
    .fontSize(16)
    .font("Helvetica")
    .fillColor("#374151")
    .text("Se certifica que", { align: "center" });

  doc.moveDown(0.5);
  doc
    .fontSize(28)
    .font("Helvetica-Bold")
    .fillColor("#111827")
    .text(studentName, { align: "center" });

  doc.moveDown(1.5);
  doc
    .fontSize(16)
    .font("Helvetica")
    .fillColor("#374151")
    .text("ha completado exitosamente el curso", { align: "center" });

  doc.moveDown(0.5);
  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .fillColor("#1E40AF")
    .text(courseTitle, { align: "center" });

  doc.moveDown(2);

  // Detalles
  doc
    .fontSize(12)
    .font("Helvetica")
    .fillColor("#6B7280")
    .text(`Fecha de emisión: ${new Date(certificate.issuedAt).toLocaleDateString("es-ES", { dateStyle: "long" })}`, { align: "center" });

  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .text(`Badge ID: ${certificate.badgeId}`, { align: "center" });

  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .text(`Verificar: ${certificate.verificationUrl}`, { align: "center", link: certificate.verificationUrl });

  doc.moveDown(1.5);

  // Footer
  doc
    .fontSize(9)
    .fillColor("#9CA3AF")
    .text(
      "Este certificado cumple el estándar Open Badges 3.0 y W3C Verifiable Credentials. " +
        "Verificado criptográficamente con EdDSA (Ed25519).",
      { align: "center" }
    );

  doc.end();

  const pdfBuffer = await pdfPromise;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-${certificate.badgeId}.pdf"`,
    },
  });
}
