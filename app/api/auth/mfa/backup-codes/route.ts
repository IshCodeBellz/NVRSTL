import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { getServerSession } from "next-auth/next";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { MFAService } from "@/lib/server/mfa";
import { z } from "zod";

export const dynamic = "force-dynamic";

const regenerateSchema = z.object({
  confirmationToken: z.string().min(6), // Require MFA token to regenerate
});

/**
 * Regenerate backup codes for MFA
 * POST /api/auth/mfa/backup-codes
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
    const { confirmationToken } = regenerateSchema.parse(body);

    // First verify the user can regenerate backup codes
    const verifyResult = await MFAService.verifyMFA(
      session.user.id,
      confirmationToken
    );

    if (!verifyResult.success) {
      return NextResponse.json(
        {
          error:
            "Invalid verification code. MFA token required to regenerate backup codes.",
          success: false,
        },
        { status: 400 }
      );
    }

    // Regenerate backup codes
    const newBackupCodes = await MFAService.regenerateBackupCodes(
      session.user.id
    );

    // Log security event
    logger.info(`Backup codes regenerated for user ${session.user.id}`, {
      timestamp: new Date().toISOString(),
      codesGenerated: newBackupCodes.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        backupCodes: newBackupCodes,
        message:
          "New backup codes have been generated. Please save them securely as the old codes are no longer valid.",
        warning:
          "These codes can only be used once each. Store them in a safe place.",
      },
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Backup codes regeneration error:", error);

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
        error: "Failed to regenerate backup codes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
