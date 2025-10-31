import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { restoreStock } from "@/lib/server/inventory";
import { OrderEventService } from "@/lib/server/orderEventService";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, userId: uid },
    select: {
      id: true,
      status: true,
      discountCodeId: true,
      discountCodeCode: true,
      discountCodeValueCents: true,
      discountCodePercent: true,
      currency: true,
      totalCents: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!["AWAITING_PAYMENT", "PENDING"].includes(order.status)) {
    return NextResponse.json({ error: "cannot_cancel" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      await tx.paymentRecord.updateMany({
        where: { orderId: order.id },
        data: { status: "CANCELLED" },
      });

      if (order.discountCodeId) {
        await tx.discountCode.updateMany({
          where: { id: order.discountCodeId, timesUsed: { gt: 0 } },
          data: { timesUsed: { decrement: 1 } },
        });
      }
    });

    const restoreResult = await restoreStock(order.id, "ORDER_CANCELLED");
    if (!restoreResult.success) {
      console.error("restoreStock failed", restoreResult.error);
    }

    await OrderEventService.createEvent({
      orderId: order.id,
      kind: "ORDER_CANCELLED",
      message: "Customer cancelled the order before payment.",
      userId: uid,
      metadata: {
        currency: order.currency,
        totalCents: order.totalCents,
        discountApplied: !!order.discountCodeId,
        restoreSucceeded: restoreResult.success,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("cancel order error", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


