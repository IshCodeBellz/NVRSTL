import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { withRequest } from "@/lib/server/logger";

// POST /api/payments/retry { orderId } - simulate creating a new payment attempt for failed/pending orders
export const POST = withRequest(async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.orderId !== "string") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const order = await prisma.order.findUnique({ where: { id: body.orderId } });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!["AWAITING_PAYMENT", "PENDING"].includes(order.status)) {
    return NextResponse.json(
      { error: "not_retryable", status: order.status },
      { status: 400 }
    );
  }
  // Close any failed attempts (noop for now) and create a new simulated intent
  const payment = await prisma.paymentRecord.create({
    data: {
      orderId: order.id,
      provider: "STRIPE",
      providerRef: `pi_sim_retry_${order.id}_${Date.now()}`,
      amountCents: order.totalCents,
      status: "PAYMENT_PENDING",
    },
  });
  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      kind: "PAYMENT_UPDATE",
      message: "Payment retry initiated",
      meta: JSON.stringify({
        paymentId: payment.id,
        providerRef: payment.providerRef,
      }),
    },
  });
  return NextResponse.json({
    ok: true,
    paymentId: payment.id,
    providerRef: payment.providerRef,
  });
});
