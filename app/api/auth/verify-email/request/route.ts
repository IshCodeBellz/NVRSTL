import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";
import { withRequest } from "@/lib/server/logger";
import {
  createErrorResponse,
  ValidationError,
  NotFoundError,
} from "@/lib/server/errors";
import { sendEmailVerification } from "@/lib/server/mailer";
import crypto from "crypto";

// POST /api/auth/verify-email/request - Request email verification
export const POST = withRequest(async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new ValidationError("Valid email address is required");
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundError("User with this email address");
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        message: "Email is already verified",
        verified: true,
      });
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store or update verification token
    await prisma.emailVerificationToken.upsert({
      where: { userId: user.id },
      update: {
        token,
        expiresAt,
        createdAt: new Date(), // Reset creation time
      },
      create: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send verification email
    const verificationUrl = `${
      process.env.NEXTAUTH_URL || "http://localhost:3000"
    }/auth/verify-email?token=${token}`;

    await sendEmailVerification(user.email, user.id, verificationUrl);

    return NextResponse.json({
      message: "Verification email sent successfully",
      email: user.email,
    });
  } catch (error) {
    logger.error("Error:", error);
    return createErrorResponse(
      error instanceof Error
        ? error
        : new Error("Email verification request failed"),
      {
        route: "/api/auth/verify-email/request",
        operation: "request_verification",
      }
    );
  }
});
