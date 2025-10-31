import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { z } from "zod";
import { getStripe } from "@/lib/server/stripe";
import { withRequest } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

// Stub: would call Stripe to create a PaymentIntent. For now, we simulate one.
// Later replace with: const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

const schema = z.object({ orderId: z.string() });

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybe = error as { message?: string; raw?: { message?: string } };
    return maybe.message || maybe.raw?.message || "Unknown error";
  }
  return "Unknown error";
}

export const POST = withRequest(async function POST(req: NextRequest) {
  let uid: string | undefined;
  const testUser =
    process.env.NODE_ENV === "test" ? req.headers.get("x-test-user") : null;
  if (testUser) {
    uid = testUser;
  } else {
    const session = await getServerSession(authOptionsEnhanced);
    uid = session?.user?.id;
  }
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, userId: uid },
  });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Allow requesting intent only when the order is still PENDING
  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: "invalid_status", status: order.status },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    // Simulated mode – reuse existing record if present for idempotency
    let existing = await prisma.paymentRecord.findFirst({
      where: { orderId: order.id, provider: "STRIPE" },
    });
    if (existing) {
      return NextResponse.json({
        orderId: order.id,
        clientSecret: `${existing.providerRef}_secret`,
        paymentIntentId: existing.providerRef,
        simulated: true,
        reused: true,
      });
    }
    // Deterministic simulated intent id derived from full order id hash fragment for stable reuse
    const fakePaymentIntentId = `pi_${order.id
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 10)}`;
    existing = await prisma.paymentRecord.create({
      data: {
        orderId: order.id,
        provider: "STRIPE",
        providerRef: fakePaymentIntentId,
        amountCents: order.totalCents,
        currency: order.currency,
        status: "PAYMENT_PENDING",
        rawPayload: JSON.stringify({ simulated: true }),
      },
    });
    // Keep order as PENDING in simulated mode as well
    return NextResponse.json({
      orderId: order.id,
      clientSecret: `${existing.providerRef}_secret`,
      paymentIntentId: existing.providerRef,
      simulated: true,
    });
  }

  // Check if existing payment record for order to ensure idempotency for this endpoint
  const existingPayment = await prisma.paymentRecord.findFirst({
    where: { orderId: order.id, provider: "STRIPE" },
  });
  if (existingPayment) {
    try {
      const pi = await stripe.paymentIntents.retrieve(
        existingPayment.providerRef
      );
      return NextResponse.json({
        orderId: order.id,
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
        reused: true,
      });
    } catch {
      // existing placeholder (likely simulated) – create real intent then UPDATE record instead of creating duplicate
      try {
        const intent = await stripe.paymentIntents.create({
          amount: order.totalCents,
          currency: order.currency.toLowerCase(),
          metadata: { orderId: order.id },
          automatic_payment_methods: { enabled: true },
        });
        const stillExists = await prisma.paymentRecord.findUnique({
          where: { id: existingPayment.id },
        });
        if (stillExists) {
          await prisma.paymentRecord.update({
            where: { id: existingPayment.id },
            data: {
              providerRef: intent.id,
              rawPayload: JSON.stringify({
                upgradedFrom: existingPayment.providerRef,
              }),
            },
          });
        } else {
          await prisma.paymentRecord.create({
            data: {
              orderId: order.id,
              provider: "STRIPE",
              providerRef: intent.id,
              amountCents: order.totalCents,
              currency: order.currency,
              status: "PAYMENT_PENDING",
              rawPayload: JSON.stringify({ createdAfterMissing: true }),
            },
          });
        }
        // Keep order as PENDING
        return NextResponse.json({
          orderId: order.id,
          clientSecret: intent.client_secret,
          paymentIntentId: intent.id,
          upgraded: true,
        });
      } catch (createErr: unknown) {
        return NextResponse.json(
          {
            error: "stripe_error",
            message: getErrorMessage(createErr),
          },
          { status: 400 }
        );
      }
    }
  }

  let intent;
  try {
    intent = await stripe.paymentIntents.create({
      amount: order.totalCents,
      currency: order.currency.toLowerCase(),
      metadata: { orderId: order.id },
      automatic_payment_methods: { enabled: true },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "stripe_error",
        message: getErrorMessage(err),
      },
      { status: 400 }
    );
  }

  await prisma.paymentRecord.create({
    data: {
      orderId: order.id,
      provider: "STRIPE",
      providerRef: intent.id,
      amountCents: order.totalCents,
      currency: order.currency,
      status: "PAYMENT_PENDING",
      rawPayload: JSON.stringify({}),
    },
  });
  // Do not move order to AWAITING_PAYMENT; keep as PENDING until payment succeeds
  return NextResponse.json({
    orderId: order.id,
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
  });
});
