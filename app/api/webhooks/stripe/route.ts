import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/server/stripe";
import { prisma } from "@/lib/server/prisma";
import { validateEnv } from "@/lib/server/env";
import { log, warn } from "@/lib/server/logger";

interface StripeEvent {
  id?: string;
  type: string;
  data?: {
    object?: {
      metadata?: {
        orderId?: string;
      };
    };
  };
  metadata?: {
    orderId?: string;
  };
}

// Stripe webhook handler: listens for payment_intent.succeeded and updates order & metrics.
// Expects STRIPE_WEBHOOK_SECRET if real Stripe is used; if absent, treats body as JSON (simulated mode).

export async function POST(req: NextRequest) {
  // Ensure env validation runs (idempotent) for early visibility in logs.
  validateEnv();
  const stripe = getStripe();
  let event: StripeEvent;
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();
  if (stripe && process.env.STRIPE_WEBHOOK_SECRET) {
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET
      ) as StripeEvent;
    } catch {
      return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
    }
  } else {
    // Simulated mode: parse JSON directly
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const eventId = event.id as string | undefined;
    if (eventId) {
      const existing = await prisma.$queryRawUnsafe<[{ eventId: string }] | []>(
        `SELECT eventId FROM ProcessedWebhookEvent WHERE eventId = ? LIMIT 1`,
        eventId
      );
      if (Array.isArray(existing) && existing.length > 0) {
        return NextResponse.json({ ok: true, idempotent: true });
      }
    }
    const pi = event.data?.object || event;
    const orderId = pi.metadata?.orderId;
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payments: true },
      });
      if (order && order.status !== "PAID" && order.status !== "CANCELLED") {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: { status: "CANCELLED", cancelledAt: new Date() },
          });
          // Update any pending payment record(s) to FAILED
          for (const pay of order.payments) {
            if (
              pay.status === "PAYMENT_PENDING" ||
              pay.status === "AUTHORIZED"
            ) {
              await tx.paymentRecord.update({
                where: { id: pay.id },
                data: { status: "FAILED" },
              });
            }
          }
          if (eventId) {
            await tx.$executeRawUnsafe(
              `INSERT INTO ProcessedWebhookEvent (id, provider, eventId, createdAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(eventId) DO NOTHING;`,
              crypto.randomUUID(),
              "STRIPE",
              eventId
            );
          }
        });
      }
    }
    return NextResponse.json({ ok: true, failure: true });
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ received: true });
  }

  const eventId = event.id as string | undefined;
  if (!eventId) {
    warn("stripe_webhook_missing_id", { type: event.type });
  } else {
    // Raw lookup (avoids needing regenerated Prisma client immediately)
    const existing = await prisma.$queryRawUnsafe<[{ eventId: string }] | []>(
      `SELECT eventId FROM ProcessedWebhookEvent WHERE eventId = ? LIMIT 1`,
      eventId
    );
    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ ok: true, idempotent: true });
    }
  }

  const pi = event.data?.object || event; // robust fallback in simulated mode
  const orderId = pi.metadata?.orderId;
  if (!orderId)
    return NextResponse.json({ error: "no_order" }, { status: 400 });

  // Idempotent: only move PENDING / AWAITING_PAYMENT -> PAID
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (order.status === "PAID")
    return NextResponse.json({ ok: true, idempotent: true });
  if (order.status !== "PENDING" && order.status !== "AWAITING_PAYMENT") {
    return NextResponse.json(
      { error: "invalid_status", status: order.status },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: new Date() },
    });
    // Update payment record(s) to CAPTURED
    const payments = await tx.paymentRecord.findMany({
      where: { orderId: order.id },
    });
    for (const pay of payments) {
      if (pay.status === "PAYMENT_PENDING" || pay.status === "AUTHORIZED") {
        await tx.paymentRecord.update({
          where: { id: pay.id },
          data: { status: "CAPTURED" },
        });
      }
    }
    const productIds = Array.from(new Set(order.items.map((i) => i.productId)));
    for (const pid of productIds) {
      await tx.$executeRawUnsafe(
        `INSERT INTO ProductMetrics (productId, views, detailViews, wishlists, addToCart, purchases, updatedAt)
         VALUES (?, 0, 0, 0, 0, 1, CURRENT_TIMESTAMP)
         ON CONFLICT(productId) DO UPDATE SET
           purchases = purchases + 1,
           updatedAt = CURRENT_TIMESTAMP;`,
        pid
      );
    }
    if (eventId) {
      await tx.$executeRawUnsafe(
        `INSERT INTO ProcessedWebhookEvent (id, provider, eventId, createdAt)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(eventId) DO NOTHING;`,
        crypto.randomUUID(),
        "STRIPE",
        eventId
      );
    }
  });
  log("stripe_webhook_success", { orderId, eventId });

  return NextResponse.json({ ok: true });
}
