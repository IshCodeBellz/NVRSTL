import {
  invokePOST,
  resetDb,
  createBasicProduct,
  addLineToCart,
} from "../helpers/testServer";
import * as checkoutRoute from "@/app/api/checkout/route";
import * as intentRoute from "@/app/api/payments/intent/route";
import { prisma } from "@/lib/server/prisma";

const hdr = { "x-test-user": "test-user" };

beforeEach(async () => {
  await resetDb();
});

describe("payment intent flow (simulated)", () => {
  async function createOrder() {
    const product = await createBasicProduct({ priceCents: 4200 });
    await addLineToCart(product.id, product.priceCents, undefined, 2); // subtotal 8400
    const body = {
      shippingAddress: {
        fullName: "Pay User",
        line1: "1",
        city: "X",
        postalCode: "00000",
        country: "US",
      },
      email: "pay@example.com",
      idempotencyKey: "pi-order-1",
    };
    const res: any = await invokePOST(
      checkoutRoute,
      "/api/checkout",
      body,
      hdr
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    return json.orderId as string;
  }

  test("creates simulated payment intent and sets status to AWAITING_PAYMENT", async () => {
    const orderId = await createOrder();
    const res: any = await invokePOST(
      intentRoute,
      "/api/payments/intent",
      { orderId },
      hdr
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.orderId).toBe(orderId);
    expect(json.paymentIntentId).toBeTruthy();
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe("AWAITING_PAYMENT");
    const payment = await prisma.paymentRecord.findFirst({
      where: { orderId },
    });
    expect(payment).not.toBeNull();
    expect(payment?.status).toBe("PAYMENT_PENDING");
  });

  test("idempotent reuse of payment intent", async () => {
    const orderId = await createOrder();
    const first: any = await invokePOST(
      intentRoute,
      "/api/payments/intent",
      { orderId },
      hdr
    );
    const firstJson = await first.json();
    const second: any = await invokePOST(
      intentRoute,
      "/api/payments/intent",
      { orderId },
      hdr
    );
    const secondJson = await second.json();
    expect(secondJson.paymentIntentId).toBe(firstJson.paymentIntentId);
    expect(secondJson.reused).toBeTruthy();
  });
});
