import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { getServerSession } from "next-auth/next";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { MFAService } from "@/lib/server/mfa";
import { z } from "zod";

export const dynamic = "force-dynamic";

const verifySchema = z.object({
  token: z.string().min(6).max(8), // TOTP codes or backup codes
  action: z.enum(["setup", "login"]).default("setup"),
});

/**
 * Verify MFA token to complete setup or during login
 * POST /api/auth/mfa/verify
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token, action } = verifySchema.parse(body);

    logger.info("MFA Verify", {
      userId: session.user.id,
      token,
      action,
    });

    let result;

    if (action === "setup") {
      // Complete MFA setup
      result = await MFAService.verifyAndEnableTOTP(session.user.id, token);
    } else {
      // Verify during login
      result = await MFAService.verifyMFA(session.user.id, token);
    }

    logger.info("MFA Verify Result", { result });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Invalid verification code",
          success: false,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        backupCodeUsed: result.backupCodeUsed || false,
        message:
          action === "setup"
            ? "MFA has been successfully enabled for your account"
            : "Successfully verified",
      },
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("MFA verification error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to verify MFA token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
