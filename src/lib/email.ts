import nodemailer from "nodemailer";

interface EmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(input: EmailInput): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpPort = Number(process.env.SMTP_PORT || 25);
  const smtpStartTls = process.env.SMTP_STARTTLS !== "false";
  const smtpRejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false";
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (smtpHost && smtpUser && smtpPassword && from) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
        requireTLS: smtpStartTls,
        tls: { rejectUnauthorized: smtpRejectUnauthorized },
        auth: { user: smtpUser, pass: smtpPassword },
      });
      await transporter.sendMail({ from, to: input.to, subject: input.subject, text: input.text, html: input.html });
      return true;
    } catch (error) {
      console.error("[email] Error enviando por SMTP", error instanceof Error ? error.message : error);
      return false;
    }
  }

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[email] No hay proveedor configurado. Destinatario: ${input.to}\n${input.text}`);
      return true;
    }
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text, html: input.html }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
