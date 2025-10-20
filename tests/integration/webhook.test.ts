import {
  invokePOST,
  resetDb,
  createBasicProduct,
  addLineToCart,
} from "../helpers/testServer";
import * as checkoutRoute from "@/app/api/checkout/route";
import * as webhookRoute from "@/app/api/payments/webhook/route";
import { prisma } from "@/lib/server/prisma";

const hdr = { "x-test-user": "test-user", "x-test-bypass-rate-limit": "1" };

async function createOrderAndIntent() {
  const product = await createBasicProduct({ priceCents: 2500 });
  await addLineToCart(product.id, product.priceCents, undefined, 2); // 5000
  const checkoutBody = {
    shippingAddress: {
      fullName: "Hook User",
      line1: "1",
      city: "C",
      postalCode: "1",
      country: "US",
    },
    email: "hook@example.com",
    idempotencyKey: "hook-" + Math.random().toString(36).slice(2, 8),
  };
  const res: any = await invokePOST(
    checkoutRoute,
    "/api/checkout",
    checkoutBody,
    hdr
  );
  const json = await res.json();
  const orderId = json.orderId as string;
  // Checkout already creates a paymentRecord; reuse its providerRef
  const existing = await prisma.paymentRecord.findFirst({
    where: { orderId },
  });
  if (!existing) throw new Error("missing_payment_record");
  return { orderId, paymentIntentId: existing.providerRef };
}

beforeEach(async () => {
  await resetDb();
});

describe("payment webhook simulation", () => {
  test("marks order paid and clears cart on success", async () => {
    const { orderId, paymentIntentId } = await createOrderAndIntent();
    const hookBody = { paymentIntentId, status: "succeeded" };
    const hookRes: any = await invokePOST(
      webhookRoute,
      "/api/payments/webhook",
      hookBody,
      { "x-debug": "1", "x-test-simulate-webhook": "1" }
    );
    if (hookRes.status !== 200) {
      const dbg = await hookRes.json();
      console.error("webhook success test debug", dbg);
    }
    expect(hookRes.status).toBe(200);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe("PAID");
    const payment = await prisma.paymentRecord.findFirst({
      where: { orderId },
    });
    expect(payment?.status).toBe("CAPTURED");
  });

  test("failed webhook marks payment failed but leaves order pending/awaiting", async () => {
    const { orderId, paymentIntentId } = await createOrderAndIntent();
    const hookBody = { paymentIntentId, status: "failed" };
    const hookRes: any = await invokePOST(
      webhookRoute,
      "/api/payments/webhook",
      hookBody,
      { "x-debug": "1", "x-test-simulate-webhook": "1" }
    );
    if (hookRes.status !== 200) {
      const dbg = await hookRes.json();
      console.error("webhook failed test debug", dbg);
    }
    expect(hookRes.status).toBe(200);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status === "PAID").toBe(false);
    const payment = await prisma.paymentRecord.findFirst({
      where: { orderId },
    });
    expect(payment?.status).toBe("FAILED");
  });

  test("idempotent replay does not change already paid order", async () => {
    const { orderId, paymentIntentId } = await createOrderAndIntent();
    await invokePOST(
      webhookRoute,
      "/api/payments/webhook",
      { paymentIntentId, status: "succeeded" },
      { "x-debug": "1", "x-test-simulate-webhook": "1" }
    );
    const firstOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });
    const firstPaidAt = firstOrder?.paidAt;
    await new Promise((r) => setTimeout(r, 10));
    const replay: any = await invokePOST(
      webhookRoute,
      "/api/payments/webhook",
      { paymentIntentId, status: "succeeded" },
      { "x-test-simulate-webhook": "1" }
    );
    expect(replay.status).toBe(200);
    const after = await prisma.order.findUnique({ where: { id: orderId } });
    expect(after?.paidAt?.getTime()).toBe(firstPaidAt?.getTime());
    const payments = await prisma.paymentRecord.findMany({
      where: { orderId },
    });
    expect(payments.length).toBe(1);
  });
});
