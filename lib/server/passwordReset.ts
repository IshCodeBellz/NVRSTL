import crypto from "crypto";
import { prisma } from "@/lib/server/prisma";
import { prismaX } from "@/lib/server/prismaEx";
import { hashPassword } from "@/lib/server/auth";
import { getMailer, buildPasswordResetHtml } from "@/lib/server/mailer";

function ttlMinutes() {
  const raw = process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES;
  const v = raw ? parseInt(raw, 10) : 30;
  if (!v || Number.isNaN(v) || v < 5 || v > 1440) return 30;
  return v;
}

export function generateTokenString(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null; // do not leak existence in caller response
  const token = generateTokenString();
  const expiresAt = new Date(Date.now() + ttlMinutes() * 60_000);
  await prismaX.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });
  return { user, token, expiresAt };
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const url = `${baseUrl}/reset-password/${encodeURIComponent(token)}`;
  const mailer = getMailer();
  await mailer.send({
    to: email,
    subject: "Password reset instructions",
    text: `Reset your password: ${url}\nThis link expires shortly. If you did not request this, ignore this email.`,
    html: buildPasswordResetHtml(url),
  });
}

export async function consumePasswordResetToken(
  token: string,
  newPassword: string
) {
  const now = new Date();
  const record = await prismaX.passwordResetToken.findUnique({
    where: { token },
  });
  if (!record) return { ok: false as const, reason: "invalid" };
  if (record.usedAt) return { ok: false as const, reason: "used" };
  if (record.expiresAt < now) return { ok: false as const, reason: "expired" };
  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) return { ok: false as const, reason: "invalid" };
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prismaX.passwordResetToken.update({
      where: { token },
      data: { usedAt: now },
    }),
    // Optional pruning: delete all expired tokens for this user to keep table tidy
    prismaX.passwordResetToken.deleteMany({
      where: { userId: user.id, expiresAt: { lt: now } },
    }),
  ]);
  return { ok: true as const };
}
