/**
 * Integration-ish test (runs in Jest environment) for checkout + payment + webhook.
 * Assumes prisma points to a test SQLite db (set DATABASE_URL before running tests).
 */
import { prisma } from "@/lib/server/prisma";
import { prismaX } from "@/lib/server/prismaEx";
import * as checkoutRoute from "@/app/api/checkout/route";
import * as intentRoute from "@/app/api/payments/intent/route";
import * as webhookRoute from "@/app/api/payments/webhook/route";
import * as noteRoute from "@/app/api/admin/orders/[id]/note/route";
import { NextRequest } from "next/server";

function buildReq(
  method: string,
  path: string,
  body?: any,
  headers: Record<string, string> = {}
) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "content-type": "application/json", ...headers },
  } as any);
}

async function seedProduct(name: string, sku: string, priceCents = 5000) {
  return prisma.product.create({
    data: {
      name,
      sku,
      description: name + " desc",
      priceCents,
      images: { create: { url: "/test.png", position: 0 } },
    },
    include: { images: true },
  });
}

describe("checkout payment flow", () => {
  const userId = "test-user-checkout-flow";
  beforeAll(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartLine.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.product.deleteMany();
  });

  it("creates order, payment intent, and finalizes via webhook", async () => {
    const p1 = await seedProduct("Flow Product 1", "FLOW-001", 1200);
    await prisma.cart.create({
      data: {
        userId,
        lines: {
          create: {
            productId: p1.id,
            qty: 2,
            priceCentsSnapshot: p1.priceCents,
          },
        },
      },
    });

    // Checkout start
    const checkoutReq = buildReq(
      "POST",
      "/api/checkout",
      {
        shippingAddress: {
          fullName: "Test User",
          line1: "123 St",
          city: "Town",
          postalCode: "12345",
          country: "US",
        },
        idempotencyKey: "idem-1234",
      },
      { "x-test-user": userId, "x-test-bypass-rate-limit": "1" }
    );
    const checkoutRes: any = await (checkoutRoute as any).POST(checkoutReq);
    expect(checkoutRes.status).toBe(200);
    const checkoutData = await checkoutRes.json();
    expect(checkoutData.orderId).toBeTruthy();

    // Payment intent
    const intentReq = buildReq(
      "POST",
      "/api/payments/intent",
      { orderId: checkoutData.orderId },
      { "x-test-user": userId }
    );
    const payRes: any = await (intentRoute as any).POST(intentReq);
    expect(payRes.status).toBe(200);
    const payData = await payRes.json();
    expect(payData.clientSecret).toBeTruthy();

    // Simulate webhook
    const webhookReq = buildReq("POST", "/api/payments/webhook", {
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: payData.paymentIntentId,
          metadata: { orderId: checkoutData.orderId },
        },
      },
    });
    const webhookRes: any = await (webhookRoute as any).POST(webhookReq);
    expect(webhookRes.status).toBe(200);
    const updated = await prisma.order.findUnique({
      where: { id: checkoutData.orderId },
    });
    expect(updated?.status).toBe("PAID");
    // Metrics updated
    const rows: any[] = await prisma.$queryRawUnsafe(
      "SELECT purchases FROM ProductMetrics WHERE productId = ? LIMIT 1",
      p1.id
    );
    expect(rows[0]?.purchases || 0).toBeGreaterThanOrEqual(1);
  });

  it("emits DISCOUNT_APPLIED event when a discount code is used", async () => {
    // seed product & discount code
    const prod = await seedProduct("Discount Prod", "DISC-001", 5000);
    const dc = await prisma.discountCode.create({
      data: {
        code: "SAVE10",
        kind: "PERCENT",
        percent: 10,
      },
    });
    await prisma.cart.create({
      data: {
        userId,
        lines: {
          create: {
            productId: prod.id,
            qty: 1,
            priceCentsSnapshot: prod.priceCents,
          },
        },
      },
    });
    const discountReq = buildReq(
      "POST",
      "/api/checkout",
      {
        shippingAddress: {
          fullName: "Disc User",
          line1: "1 St",
          city: "Town",
          postalCode: "12345",
          country: "US",
        },
        discountCode: dc.code,
      },
      { "x-test-user": userId, "x-test-bypass-rate-limit": "1" }
    );
    const res: any = await (checkoutRoute as any).POST(discountReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    const events = await prismaX.orderEvent.findMany({
      where: { orderId: data.orderId },
      orderBy: { createdAt: "asc" },
    });
    const found = events.some((e: any) => e.kind === "DISCOUNT_APPLIED");
    expect(found).toBe(true);
  });

  it("allows admin to add NOTE event", async () => {
    const p = await seedProduct("Note Prod", "NOTE-001", 3000);
    await prisma.cart.create({
      data: {
        userId,
        lines: {
          create: {
            productId: p.id,
            qty: 1,
            priceCentsSnapshot: p.priceCents,
          },
        },
      },
    });
    const noteCheckoutReq = buildReq(
      "POST",
      "/api/checkout",
      {
        shippingAddress: {
          fullName: "Note User",
          line1: "1 St",
          city: "Town",
          postalCode: "12345",
          country: "US",
        },
      },
      { "x-test-user": userId, "x-test-bypass-rate-limit": "1" }
    );
    const checkoutRes2: any = await (checkoutRoute as any).POST(
      noteCheckoutReq
    );
    expect(checkoutRes2.status).toBe(200);
    const order = await checkoutRes2.json();
    const noteReq = buildReq(
      "POST",
      `/api/admin/orders/${order.orderId}/note`,
      { message: "Internal note" },
      { "x-test-user": userId }
    );
    const noteRes: any = await (noteRoute as any).POST(noteReq, {
      params: { id: order.orderId },
    });
    expect(noteRes.status).toBe(200);
    const evs = await prismaX.orderEvent.findMany({
      where: { orderId: order.orderId },
    });
    expect(
      evs.some((e: any) => e.kind === "NOTE" && e.message === "Internal note")
    ).toBe(true);
  });
});
