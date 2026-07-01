"use client";

import {
  Award,
  Download,
  ExternalLink,
  ShieldCheck,
  ShieldX,
  Calendar,
  User,
  BookOpen,
} from "lucide-react";

interface CertificateData {
  id: string;
  badgeId: string;
  verificationUrl: string;
  isRevoked: boolean;
  revocationReason?: string;
  issuedAt: string;
  enrollment?: {
    user: { name: string };
    course: { title: { es: string; en: string }; slug: string };
  };
}

interface CertificateViewerProps {
  certificate: CertificateData;
  lang: string;
  showActions?: boolean;
  onRevoke?: (id: string) => void;
}

export function CertificateViewer({
  certificate,
  lang,
  showActions,
  onRevoke,
}: CertificateViewerProps) {
  const t = (es: string, en: string) => (lang === "en" ? en : es);
  const courseTitle = certificate.enrollment
    ? ((certificate.enrollment.course.title as { es?: string }).es ||
        (certificate.enrollment.course.title as { en?: string }).en ||
        "")
    : "";

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        certificate.isRevoked
          ? "border-[#c0392b]/30"
          : "border-[#b9f8cf] dark:border-green-900"
      }`}
    >
      {/* Status header */}
      <div
        className={`px-5 py-3 flex items-center gap-2 text-sm font-medium ${
          certificate.isRevoked
            ? "bg-[#c0392b]/10 text-black"
            : "bg-[#f0fdf4] dark:bg-green-950/30 text-black dark:text-green-400"
        }`}
      >
        {certificate.isRevoked ? (
          <>
            <ShieldX className="w-4 h-4" />
            {t("Certificado Revocado", "Revoked Certificate")}
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" />
            {t("Certificado Válido", "Valid Certificate")}
          </>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              certificate.isRevoked
                ? "bg-[#c0392b]/10"
                : "bg-[#fef3c6] dark:bg-amber-900/30"
            }`}
          >
            <Award
              className={`w-7 h-7 ${
                certificate.isRevoked
                  ? "text-black"
                  : "text-[#d97706]"
              }`}
            />
          </div>
          <div>
            <h4 className="font-semibold">{courseTitle}</h4>
            {certificate.enrollment && (
              <p className="text-sm text-[#7b8fa1] flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {certificate.enrollment.user.name}
              </p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-[#7b8fa1] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {t("Emitido", "Issued")}
            </span>
            <p className="font-medium">
              {new Date(certificate.issuedAt).toLocaleDateString(
                lang === "en" ? "en-US" : "es-ES",
                { dateStyle: "medium" }
              )}
            </p>
          </div>
          <div>
            <span className="text-[#7b8fa1] flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {t("Badge ID", "Badge ID")}
            </span>
            <p className="font-medium text-xs font-mono truncate">
              {certificate.badgeId}
            </p>
          </div>
        </div>

        {certificate.revocationReason && (
          <p className="text-sm text-black bg-[#c0392b]/5 p-2 rounded">
            <strong>{t("Razón:", "Reason:")}</strong>{" "}
            {certificate.revocationReason}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t">
          {!certificate.isRevoked && (
            <>
              <a
                href={`/api/certificates/${certificate.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Download className="w-4 h-4" />
                {t("Descargar PDF", "Download PDF")}
              </a>
              <a
                href={certificate.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[#7b8fa1] hover:text-black"
              >
                <ExternalLink className="w-4 h-4" />
                {t("Verificar", "Verify")}
              </a>
            </>
          )}
          {showActions && onRevoke && !certificate.isRevoked && (
            <button
              onClick={() => onRevoke(certificate.id)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-black hover:underline ml-auto"
            >
              <ShieldX className="w-4 h-4" />
              {t("Revocar", "Revoke")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
