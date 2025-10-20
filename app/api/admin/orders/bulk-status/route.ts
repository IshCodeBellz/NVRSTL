import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { isOrderStatus, type OrderStatus } from "@/lib/status";
import { OrderStatusService } from "@/lib/server/orderStatusService";

export async function POST(req: NextRequest) {
  try {
    // Check authentication and admin access
    const session = await getServerSession(authOptionsEnhanced);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { orderIds, targetStatus, reason, continueOnError } = body;

    // Validate input
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: "invalid_order_ids" }, { status: 400 });
    }

    if (!targetStatus || !isOrderStatus(targetStatus)) {
      return NextResponse.json(
        { error: "invalid_target_status" },
        { status: 400 }
      );
    }

    if (orderIds.length > 100) {
      return NextResponse.json(
        {
          error: "too_many_orders",
          message: "Maximum 100 orders per bulk operation",
        },
        { status: 400 }
      );
    }

    // Perform bulk transition
    const result = await OrderStatusService.bulkTransitionOrders(
      orderIds,
      targetStatus as OrderStatus,
      {
        adminUserId: session.user.id,
        reason: reason || "Bulk admin status change",
        continueOnError: continueOnError || true,
      }
    );

    return NextResponse.json({
      success: true,
      result,
      summary: {
        total: orderIds.length,
        successful: result.successful.length,
        failed: result.failed.length,
      },
    });
  } catch (error) {
    logger.error("Error in bulk status transition:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
