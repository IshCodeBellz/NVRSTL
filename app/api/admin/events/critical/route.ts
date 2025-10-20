import { NextRequest, NextResponse } from "next/server";
import { OrderEventService } from "@/lib/server/orderEventService";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { logger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Check authentication and admin access
    const session = await getServerSession(authOptionsEnhanced);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const timeRange = searchParams.get("timeRange") || "24h";

    // Calculate time range
    let startDate: Date;
    switch (timeRange) {
      case "1h":
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case "24h":
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Get critical events
    const criticalEvents = await OrderEventService.getCriticalEvents(limit);

    // Get overall analytics
    const analytics = await OrderEventService.getEventAnalytics(undefined, {
      start: startDate,
      end: new Date(),
    });

    return NextResponse.json({
      success: true,
      criticalEvents,
      analytics,
      timeRange: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to fetch critical events:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
