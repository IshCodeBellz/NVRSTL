import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { OrderEventService } from "@/lib/server/orderEventService";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin access
    const session = await getServerSession(authOptionsEnhanced);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const orderId = params.id;
    if (!orderId) {
      return NextResponse.json({ error: "missing_order_id" }, { status: 400 });
    }

    // Get enhanced order events
    const events = await OrderEventService.getOrderEvents(orderId);

    // Get event analytics for this order
    const analytics = await OrderEventService.getEventAnalytics(orderId);

    return NextResponse.json({
      success: true,
      events,
      analytics,
    });
  } catch (error) {
    logger.error("Failed to fetch enhanced order events:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
