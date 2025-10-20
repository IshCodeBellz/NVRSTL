import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { TrackingService } from "@/lib/server/shipping/TrackingService";

/**
 * Automated tracking update endpoint
 * Can be called by cron jobs or webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron authorization (in production, use proper auth)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "dev-secret";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("🚚 Starting automated tracking updates...");

    // Poll carriers for tracking updates
    await TrackingService.pollCarrierUpdates();

    logger.info("✅ Automated tracking updates completed");

    return NextResponse.json({
      success: true,
      message: "Tracking updates completed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error in automated tracking update:", error);
    return NextResponse.json(
      {
        error: "Failed to update tracking information",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Manual trigger endpoint for admin users
 */
export async function GET() {
  try {
    logger.info("🔄 Manual tracking update triggered");

    // Poll carriers for tracking updates
    await TrackingService.pollCarrierUpdates();

    logger.info("✅ Manual tracking updates completed");

    return NextResponse.json({
      success: true,
      message: "Manual tracking update completed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error in manual tracking update:", error);
    return NextResponse.json(
      {
        error: "Failed to update tracking information",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
