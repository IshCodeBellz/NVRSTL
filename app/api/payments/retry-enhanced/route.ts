import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { getStripe } from "@/lib/server/stripe";
import { OrderEventService } from "@/lib/server/orderEventService";
import { PaymentStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

interface RetryPaymentRequest {
  orderId: string;
  paymentId: string;
  maxRetries?: number;
}

interface RetryPaymentResponse {
  success: boolean;
  message: string;
  paymentIntentId?: string;
  nextRetryAt?: string;
  retriesRemaining?: number;
}

/**
 * Enhanced payment retry endpoint
 * Provides automatic retry mechanism with exponential backoff
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<RetryPaymentResponse>> {
  try {
    // Authentication check
    const session = await getServerSession(authOptionsEnhanced);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      orderId,
      paymentId,
      maxRetries = 3,
    } = (await req.json()) as RetryPaymentRequest;

    if (!orderId || !paymentId) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify order ownership
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      include: {
        payments: {
          where: { id: paymentId },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    const payment = order.payments[0];
    if (!payment) {
      return NextResponse.json(
        { success: false, message: "Payment not found" },
        { status: 404 }
      );
    }

    // Check if payment is eligible for retry
    if (payment.status === PaymentStatus.CAPTURED) {
      return NextResponse.json(
        { success: false, message: "Payment already successful" },
        { status: 400 }
      );
    }

    // Count existing retry attempts (using order events as a record)
    const allEvents = await OrderEventService.getOrderEvents(orderId);
    const retryEvents = allEvents.filter(
      (event) => event.kind === "PAYMENT_RETRY_ATTEMPT"
    );

    if (retryEvents.length >= maxRetries) {
      return NextResponse.json(
        {
          success: false,
          message: `Maximum retry attempts (${maxRetries}) exceeded`,
        },
        { status: 400 }
      );
    }

    // Create new payment intent for retry
    const retryResult = await createRetryPaymentIntent(order, payment);

    if (!retryResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: retryResult.error || "Failed to create retry payment",
        },
        { status: 500 }
      );
    }

    // Log retry attempt
    await OrderEventService.createEvent({
      orderId,
      kind: "PAYMENT_RETRY_ATTEMPT",
      message: `Payment retry attempt ${retryEvents.length + 1} initiated`,
      metadata: {
        paymentId: retryResult.paymentIntentId!,
        paymentAmount: order.totalCents,
        paymentCurrency: order.currency,
      },
    });

    // Calculate next retry time (exponential backoff)
    const nextRetryDelay = Math.min(
      300000 * Math.pow(2, retryEvents.length),
      3600000
    ); // Cap at 1 hour
    const nextRetryAt = new Date(Date.now() + nextRetryDelay);

    return NextResponse.json({
      success: true,
      message: "Payment retry initiated successfully",
      paymentIntentId: retryResult.paymentIntentId,
      nextRetryAt: nextRetryAt.toISOString(),
      retriesRemaining: maxRetries - retryEvents.length - 1,
    });
  } catch (error) {
    logger.error("Payment retry error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Create a new payment intent for retry
 */
async function createRetryPaymentIntent(
  order: { id: string; totalCents: number; currency: string },
  originalPayment: { id: string; providerRef: string | null }
): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
  try {
    const stripe = getStripe();

    if (!stripe) {
      // Simulate payment intent for development/testing
      const simulatedId = `pi_retry_sim_${order.id}_${Date.now()}`;

      await prisma.paymentRecord.create({
        data: {
          orderId: order.id,
          provider: "STRIPE",
          providerRef: simulatedId,
          amountCents: order.totalCents,
          currency: order.currency,
          status: PaymentStatus.PAYMENT_PENDING,
          rawPayload: JSON.stringify({
            retryAttempt: true,
            simulated: true,
            originalPaymentId: originalPayment.id,
          }),
        },
      });

      return { success: true, paymentIntentId: simulatedId };
    }

    // Create new Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.totalCents,
      currency: order.currency.toLowerCase(),
      metadata: {
        orderId: order.id,
        retryAttempt: "true",
        originalPaymentRef: originalPayment.providerRef || "",
      },
    });

    // Store new payment record
    await prisma.paymentRecord.create({
      data: {
        orderId: order.id,
        provider: "STRIPE",
        providerRef: paymentIntent.id,
        amountCents: order.totalCents,
        currency: order.currency,
        status: PaymentStatus.PAYMENT_PENDING,
        rawPayload: JSON.stringify(paymentIntent),
      },
    });

    return { success: true, paymentIntentId: paymentIntent.id };
  } catch (error) {
    logger.error("Failed to create retry payment intent:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get retry status for an order
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptionsEnhanced);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    // Get retry events for this order
    const allEvents = await OrderEventService.getOrderEvents(orderId);
    const retryEvents = allEvents.filter(
      (event) => event.kind === "PAYMENT_RETRY_ATTEMPT"
    );

    // Get current order status
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const latestPayment = order.payments[0];
    const maxRetries = 3;

    return NextResponse.json({
      orderId,
      retryCount: retryEvents.length,
      maxRetries,
      retriesRemaining: Math.max(0, maxRetries - retryEvents.length),
      canRetry:
        retryEvents.length < maxRetries &&
        latestPayment?.status !== PaymentStatus.CAPTURED,
      orderStatus: order.status,
      paymentStatus: latestPayment?.status,
      retryHistory: retryEvents.map((event, index) => ({
        attemptNumber: index + 1,
        timestamp: event.createdAt,
        paymentId: event.parsedMeta?.paymentId,
      })),
    });
  } catch (error) {
    logger.error("Get retry status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
