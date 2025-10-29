import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { getStripe } from "@/lib/server/stripe";
import { PaymentStatus, OrderStatus } from "@/lib/status";
import { logger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

/**
 * Sync order payment status from Stripe
 * Checks Stripe for the latest payment intent status and updates the order accordingly
 */
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

    const orderId = params.id;

    // Get order with payment records
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          where: { provider: "STRIPE" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    }

    // Find the latest Stripe payment record
    const stripePayment = order.payments.find((p) => p.provider === "STRIPE");
    if (!stripePayment || !stripePayment.providerRef) {
      return NextResponse.json(
        {
          error: "no_stripe_payment_found",
          message: "No Stripe payment record found for this order",
        },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "stripe_not_configured", message: "Stripe is not configured" },
        { status: 500 }
      );
    }

    // Fetch payment intent from Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(
        stripePayment.providerRef
      );
    } catch (error: any) {
      logger.error("Failed to retrieve payment intent from Stripe:", error);
      return NextResponse.json(
        {
          error: "stripe_error",
          message: `Failed to retrieve payment intent: ${
            error.message || "Unknown error"
          }`,
        },
        { status: 500 }
      );
    }

    const stripeStatus = paymentIntent.status;
    const wasUpdated = { order: false, payment: false };

    // Update payment record status if needed
    if (
      stripeStatus === "succeeded" &&
      stripePayment.status !== PaymentStatus.CAPTURED
    ) {
      await prisma.paymentRecord.update({
        where: { id: stripePayment.id },
        data: { status: PaymentStatus.CAPTURED },
      });
      wasUpdated.payment = true;
      logger.info(`Updated payment record ${stripePayment.id} to CAPTURED`);
    } else if (
      stripeStatus === "requires_payment_method" ||
      stripeStatus === "canceled"
    ) {
      if (stripePayment.status !== PaymentStatus.FAILED) {
        await prisma.paymentRecord.update({
          where: { id: stripePayment.id },
          data: { status: PaymentStatus.FAILED },
        });
        wasUpdated.payment = true;
        logger.info(`Updated payment record ${stripePayment.id} to FAILED`);
      }
    }

    // Update order status if payment succeeded but order is still awaiting payment
    if (
      stripeStatus === "succeeded" &&
      order.status === OrderStatus.AWAITING_PAYMENT
    ) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            paidAt: new Date(),
          },
        });

        // Clear cart if user exists
        if (order.userId) {
          const cart = await tx.cart.findUnique({
            where: { userId: order.userId },
          });
          if (cart) {
            await tx.cartLine.deleteMany({ where: { cartId: cart.id } });
          }
        }
      });
      wasUpdated.order = true;
      logger.info(`Updated order ${order.id} from AWAITING_PAYMENT to PAID`);
    }

    return NextResponse.json({
      success: true,
      orderId,
      stripeStatus,
      currentOrderStatus: order.status,
      currentPaymentStatus: stripePayment.status,
      updated: wasUpdated,
      message: wasUpdated.order
        ? "Order status updated from AWAITING_PAYMENT to PAID"
        : wasUpdated.payment
        ? "Payment record updated to match Stripe status"
        : "Order status already in sync with Stripe",
    });
  } catch (error) {
    logger.error("Error syncing payment status from Stripe:", error);
    return NextResponse.json(
      {
        error: "internal_server_error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
