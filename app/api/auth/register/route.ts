import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";
import { hashPassword } from "@/lib/server/auth";
import { z } from "zod";
import crypto from "crypto";
import { sendEmailVerification } from "@/lib/server/mailer";
import { Prisma } from "@prisma/client";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }
    const { email, password, name } = parsed.data;
    const lower = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: lower } });
    if (existing) {
      return NextResponse.json({ error: "email_exists" }, { status: 409 });
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email: lower, passwordHash, name },
      select: { id: true, email: true },
    });

    // Generate verification token & store
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token, expiresAt },
    });
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verificationUrl = `${base}/verify-email/${token}`;
    await sendEmailVerification(user.email, user.id, verificationUrl);

    // Do NOT sign user in yet; require verification
    return NextResponse.json({
      status: "pending_verification",
      message: "Registration received. Please verify via email link.",
    });
  } catch (error: unknown) {
    // Centralized logging with a stable prefix so we can grep in logs
    logger.error("[REGISTER:error]", error);

    // Map common Prisma / DB issues to clearer diagnostics (only exposed outside production)
    const isProd = process.env.NODE_ENV === "production";
    let debug: Record<string, unknown> | undefined;

    if (!isProd) {
      // Unique constraint (email already taken but race before findUnique returned)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          debug = {
            classification: "unique_constraint",
            field: error.meta?.target,
            suggestion:
              "Email already exists. Frontend should handle 409 gracefully.",
          };
        }
      }
      // Look for missing column / schema drift issues (commonly seen when prod DB missing migrations)
      const msg = (
        error instanceof Error ? error.message : String(error)
      ).toLowerCase();
      if (!debug && /column .*name.* does not exist/.test(msg)) {
        debug = {
          classification: "schema_drift_missing_column",
          missing: "User.name or related column",
          suggestion:
            "Run: export DATABASE_URL=<prod_url> && npx prisma migrate deploy (or ensure all migrations are applied).",
        };
      }
      if (
        !debug &&
        /emailverificationtoken/i.test(msg) &&
        /relation/i.test(msg)
      ) {
        debug = {
          classification: "schema_drift_missing_table",
          missing: "EmailVerificationToken table",
          suggestion:
            "Production DB may be missing recent migrations. Apply pending migrations.",
        };
      }
      if (!debug) {
        debug = {
          classification: "unclassified",
          suggestion:
            "Inspect server log stack & confirm migrations are in sync.",
        };
      }
    }

    return NextResponse.json(
      { error: "register_failed", ...(debug ? { debug } : {}) },
      { status: 500 }
    );
  }
}
