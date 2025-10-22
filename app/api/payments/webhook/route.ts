import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";
import { sendPaymentReceipt } from "@/lib/server/mailer";
import { OrderStatus, PaymentStatus } from "@/lib/status";
import { getStripe } from "@/lib/server/stripe";
import { restoreStock } from "@/lib/server/inventory";
import { WebhookService, type WebhookEvent } from "@/lib/server/webhookService";
import { OrderEventService } from "@/lib/server/orderEventService";
import { OrderNotificationHandler } from "@/lib/server/notifications/OrderNotificationHandler";
import Stripe from "stripe";

interface WebhookBody {
  paymentIntentId?: string;
  payment_intent_id?: string;
  id?: string;
  status?: string;
  state?: string;
}

/**
 * Process payment webhook event with retry logic
 */
async function processPaymentWebhook(event: WebhookEvent): Promise<void> {
  const { paymentIntentId, status } = event.data;

  // Type guard for safety
  if (typeof paymentIntentId !== "string" || typeof status !== "string") {
    throw new Error("Invalid webhook event data types");
  }

  const payment = await prisma.paymentRecord.findFirst({
    where: { provider: "STRIPE", providerRef: paymentIntentId },
  });
  if (!payment) {
    // Unknown payment intent - not an error for webhook processing
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: payment.orderId },
  });
  if (!order) {
    throw new Error(`Order not found: ${payment.orderId}`);
  }

  if (status === "succeeded") {
    // Skip if already captured / paid
    if (
      payment.status === PaymentStatus.CAPTURED ||
      order.status === OrderStatus.PAID
    ) {
      return; // Idempotent - already processed
    }

    await prisma.$transaction(async (tx) => {
      await tx.paymentRecord.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.CAPTURED },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      });
      // Enhanced payment event will be created after transaction
      if (order.userId) {
        const cart = await tx.cart.findUnique({
          where: { userId: order.userId },
        });
        if (cart) await tx.cartLine.deleteMany({ where: { cartId: cart.id } });
      }
    });

    // Create enhanced payment success event
    await OrderEventService.createPaymentEvent(order.id, "PAYMENT_SUCCEEDED", {
      paymentId: payment.id,
      amount: order.totalCents,
      currency: order.currency,
      provider: payment.provider,
    });

    // Email user about payment capture (non-critical, don't fail webhook for this)
    try {
      if (order.userId) {
        const user = await prisma.user.findUnique({
          where: { id: order.userId },
        });
        if (user) await sendPaymentReceipt(user, order);
      }
    } catch (error) {
      logger.error("Non-critical email error:", error);
      // Don't throw - email failures shouldn't fail webhook processing
    }
  } else if (status === "failed") {
    if (payment.status !== PaymentStatus.FAILED) {
      await prisma.$transaction(async (tx) => {
        await tx.paymentRecord.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });
        // Enhanced payment event will be created after transaction
      });

      // Create enhanced payment failure event
      await OrderEventService.createPaymentEvent(order.id, "PAYMENT_FAILED", {
        paymentId: payment.id,
        amount: order.totalCents,
        currency: order.currency,
        provider: payment.provider,
        failureReason: "Payment processing failed",
      });

      // Restore stock for failed payment
      const stockResult = await restoreStock(order.id, "PAYMENT_FAILED");
      if (!stockResult.success) {
        throw new Error(
          `Stock restoration failed for order ${order.id}: ${stockResult.error}`
        );
      }

      // Create stock restoration event if restoration was successful
      if (stockResult.success && stockResult.restoredItems > 0) {
        await OrderEventService.createEvent({
          orderId: order.id,
          kind: "STOCK_RESTORED",
          message: `Stock restored for ${stockResult.restoredItems} items due to payment failure`,
          metadata: {
            statusChangeReason: "Payment failed - stock restored to inventory",
            totalQuantity: stockResult.restoredItems,
          },
        });
      }

      // Send payment failure notification to customer (non-critical)
      try {
        await OrderNotificationHandler.sendPaymentFailureNotification(
          order.id,
          "Payment processing failed. Please update your payment method to complete your order."
        );
      } catch (error) {
        logger.error("Failed to send payment failure notification:", error);
        // Don't fail webhook processing for notification errors
      }
    }
  }
}

// Handles both simulated (no Stripe key) and real Stripe webhook events.
export async function POST(req: NextRequest) {
  const forceSim =
    process.env.NODE_ENV === "test" &&
    req.headers.get("x-test-simulate-webhook") === "1";

  let paymentIntentId: string | undefined;
  let status: string | undefined;
  let webhookId: string | undefined;

  if (!forceSim && process.env.STRIPE_SECRET_KEY) {
    // Real Stripe webhook
    const stripe = getStripe();
    const signature = req.headers.get("stripe-signature");
    const hasSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
    // If Stripe SDK available and webhook secret configured, verify signature
    if (stripe && signature && hasSecret) {
      let event: Stripe.Event;
      try {
        const body = await req.text();
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET!
        );
      } catch (error: unknown) {
        logger.error("Webhook signature verification failed:", error);
        return NextResponse.json(
          { error: "invalid_signature" },
          { status: 400 }
        );
      }

      if (
        event.type !== "payment_intent.succeeded" &&
        event.type !== "payment_intent.payment_failed"
      ) {
        return NextResponse.json({ received: true });
      }

      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      paymentIntentId = paymentIntent.id;
      status =
        event.type === "payment_intent.succeeded" ? "succeeded" : "failed";
      webhookId = event.id;
    } else {
      // Fallback: parse JSON without signature verification (useful when webhook secret isn't set)
      try {
        const evt = (await req.json()) as {
          id?: string;
          type?: string;
          data?: { object?: { id?: string; status?: string } };
        };
        const type = evt?.type || "";
        if (
          type !== "payment_intent.succeeded" &&
          type !== "payment_intent.payment_failed"
        ) {
          return NextResponse.json({ received: true });
        }
        webhookId = evt.id;
        paymentIntentId = evt?.data?.object?.id as string | undefined;
        status = type === "payment_intent.succeeded" ? "succeeded" : "failed";
      } catch {
        return NextResponse.json(
          { error: "invalid_json", detail: "Could not parse event" },
          { status: 400 }
        );
      }
    }
  } else {
    // Simulated webhook (for test mode / no Stripe key)
    const body: WebhookBody = await req.json();
    paymentIntentId = [
      body.paymentIntentId,
      body.payment_intent_id,
      body.id,
    ].find((v) => typeof v === "string");
    status =
      typeof body.status === "string"
        ? body.status
        : typeof body.state === "string"
        ? body.state
        : undefined;
    if (typeof status === "string") status = status.toLowerCase();
    // Normalise to canonical succeeded/failed strings
    if (status === "success") status = "succeeded";
    if (status === "fail") status = "failed";
    webhookId = `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  if (!paymentIntentId || !status) {
    return NextResponse.json(
      { error: "missing_parameters", got: { paymentIntentId, status } },
      { status: 400 }
    );
  }
  if (status !== "succeeded" && status !== "failed") {
    return NextResponse.json(
      { error: "invalid_status", status },
      { status: 400 }
    );
  }

  // Check for duplicate webhook
  if (webhookId && (await WebhookService.isDuplicateWebhook(webhookId))) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Find the order ID for logging
  const payment = await prisma.paymentRecord.findFirst({
    where: { provider: "STRIPE", providerRef: paymentIntentId },
  });

  const webhookEvent: WebhookEvent = {
    id: webhookId || `unknown_${Date.now()}`,
    type: `payment_intent.${status}`,
    data: {
      paymentIntentId,
      status,
      orderId: payment?.orderId,
    },
    created: Date.now(),
  };

  // Process webhook with retry logic
  const result = await WebhookService.processWithRetry(
    webhookEvent,
    processPaymentWebhook
  );

  if (!result.success) {
    logger.error("Webhook processing failed after all retries:", result.error);
    return NextResponse.json(
      { error: "processing_failed", attempts: result.attempts.length },
      { status: 500 }
    );
  }

  if (!payment) {
    // Gracefully ack unknown payment intent
    return NextResponse.json({ ok: true, ignored: true });
  }

  return NextResponse.json({
    ok: true,
    attempts: result.attempts.length,
    processed: true,
  });
}
