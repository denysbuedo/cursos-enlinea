import { createHash, randomBytes } from "node:crypto";
import { AuthTokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TOKEN_BYTES = 32;

export const PASSWORD_MIN_LENGTH = 10;

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "La contraseña debe incluir mayúsculas, minúsculas y números.";
  }
  if (["Password123", "Password123!", "Qwerty123", "1234567890"].includes(password)) {
    return "La contraseña elegida es demasiado común.";
  }
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueAuthToken(userId: string, type: AuthTokenType, ttlMs: number) {
  const rawToken = createRawToken();
  await prisma.authToken.deleteMany({ where: { userId, type } });
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return rawToken;
}

export async function consumeAuthToken(rawToken: string, type: AuthTokenType) {
  const token = await prisma.authToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });
  if (!token || token.type !== type || token.usedAt || token.expiresAt <= new Date()) return null;

  await prisma.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
  return token;
}

export async function revokeUserSessions(userId: string) {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}
