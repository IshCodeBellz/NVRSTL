import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { getServerSession } from "next-auth/next";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { MFAService } from "@/lib/server/mfa";
import { captureError } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

/**
 * Setup MFA for the authenticated user
 * POST /api/auth/mfa/setup
 */
export async function POST() {
  let session;
  try {
    session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Setup TOTP MFA
    const setupResult = await MFAService.setupTOTP(
      session.user.id,
      "NVRSTL"
    );

    return NextResponse.json({
      success: true,
      data: {
        qrCodeUrl: setupResult.qrCodeUrl,
        secret: setupResult.secret, // Return the secret directly
        backupCodes: setupResult.backupCodes,
        message:
          "Scan the QR code with your authenticator app, then verify with a code to complete setup",
      },
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("MFA setup error:", error);
    captureError(error as Error, {
      userId: session?.user?.id,
    });

    return NextResponse.json(
      {
        error: "Failed to setup MFA",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Get MFA status for the authenticated user
 * GET /api/auth/mfa/setup
 */
export async function GET() {
  let session;
  try {
    session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const mfaStatus = await MFAService.getMFAStatus(session.user.id);

    return NextResponse.json({
      success: true,
      data: mfaStatus,
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("MFA status error:", error);
    captureError(error as Error, {
      userId: session?.user?.id,
    });

    return NextResponse.json(
      {
        error: "Failed to get MFA status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
