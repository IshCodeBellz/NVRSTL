import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { isOrderStatus, type OrderStatus } from "@/lib/status";
import { OrderStatusService } from "@/lib/server/orderStatusService";

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

    const { searchParams } = new URL(req.url);
    const targetStatus = searchParams.get("targetStatus");

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: params.id },
    });

    if (!order) {
      return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    }

    const currentStatus = order.status as OrderStatus;

    // If no target status specified, return all valid transitions
    if (!targetStatus) {
      const validTransitions =
        OrderStatusService.getValidTransitions(currentStatus);
      return NextResponse.json({
        success: true,
        currentStatus,
        validTransitions,
      });
    }

    // Validate specific transition
    if (!isOrderStatus(targetStatus)) {
      return NextResponse.json(
        { error: "invalid_target_status" },
        { status: 400 }
      );
    }

    const validation = OrderStatusService.validateTransition(
      currentStatus,
      targetStatus as OrderStatus,
      order
    );

    return NextResponse.json({
      success: true,
      currentStatus,
      targetStatus,
      validation,
      validTransitions: OrderStatusService.getValidTransitions(currentStatus),
    });
  } catch (error) {
    logger.error("Error validating status transition:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin access
    const session = await getServerSession(authOptionsEnhanced);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetStatus, reason, forceTransition } = body;

    if (!targetStatus || !isOrderStatus(targetStatus)) {
      return NextResponse.json(
        { error: "invalid_target_status" },
        { status: 400 }
      );
    }

    // Perform the transition
    const result = await OrderStatusService.transitionOrderStatus(
      params.id,
      targetStatus as OrderStatus,
      {
        adminUserId: session.user.id,
        reason: reason || "Admin status change via API",
        forceTransition: forceTransition || false,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error transitioning order status:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
