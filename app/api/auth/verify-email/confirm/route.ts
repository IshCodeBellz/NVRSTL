import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";
import { withRequest } from "@/lib/server/logger";
import {
  createErrorResponse,
  ValidationError,
  NotFoundError,
  AppError,
} from "@/lib/server/errors";

// POST /api/auth/verify-email/confirm - Confirm email verification
export const POST = withRequest(async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      throw new ValidationError("Verification token is required");
    }

    // Find and validate token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new NotFoundError("Verification token");
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      throw new AppError(
        "Verification token has expired",
        400,
        "TOKEN_EXPIRED"
      );
    }

    // Check if token was already used
    if (verificationToken.usedAt) {
      throw new AppError(
        "Verification token has already been used",
        400,
        "TOKEN_USED"
      );
    }

    // Check if user is already verified
    if (verificationToken.user.emailVerified) {
      // Mark token as used and return success
      await prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      });

      return NextResponse.json({
        message: "Email is already verified",
        verified: true,
      });
    }

    // Verify the email address
    await prisma.$transaction(async (tx) => {
      // Mark user as verified
      await tx.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      // Mark token as used
      await tx.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      });
    });

    return NextResponse.json({
      message: "Email verified successfully",
      verified: true,
      user: {
        id: verificationToken.user.id,
        email: verificationToken.user.email,
        emailVerified: true,
      },
    });
  } catch (error) {
    logger.error("Error:", error);
    return createErrorResponse(
      error instanceof Error ? error : new Error("Email verification failed"),
      {
        route: "/api/auth/verify-email/confirm",
        operation: "confirm_verification",
      }
    );
  }
});
