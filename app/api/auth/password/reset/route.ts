import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumePasswordResetToken } from "@/lib/server/passwordReset";
import { prismaX } from "@/lib/server/prismaEx";

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6).max(100),
});

const validateSchema = z.object({
  token: z.string().min(10),
  validate: z.literal(true),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  // Check if this is a validation request
  const validateParsed = validateSchema.safeParse(body);
  if (validateParsed.success) {
    const { token } = validateParsed.data;

    // Validate token without consuming it
    const now = new Date();

    // Try both prismaX and direct prisma to see which one works
    const record = await prismaX.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || record.usedAt || record.expiresAt < now) {
      return NextResponse.json(
        { ok: false, error: "invalid_token" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, valid: true });
  }

  // Handle password reset request
  const resetParsed = resetSchema.safeParse(body);
  if (!resetParsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_payload" },
      { status: 400 }
    );
  }

  const { token, password } = resetParsed.data;
  const result = await consumePasswordResetToken(token, password);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.reason },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
