import {
  invokePOST,
  resetDb,
  createBasicProduct,
  createDiscountFixed,
  addLineToCart,
} from "../helpers/testServer";
import * as checkoutRoute from "@/app/api/checkout/route";
import { prisma } from "@/lib/server/prisma";

// Mock mailer & stripe side-effects if they exist via jest automock (if needed we could mock modules)

beforeEach(async () => {
  await resetDb();
});

describe("checkout flow", () => {
  test("happy path without discount", async () => {
    const product = await createBasicProduct({
      priceCents: 5000,
      sizes: ["M"],
    });
    await addLineToCart(product.id, product.priceCents, "M", 1);
    const body = {
      shippingAddress: {
        fullName: "John Doe",
        line1: "123 St",
        city: "Town",
        postalCode: "12345",
        country: "US",
      },
      email: "john@example.com",
      idempotencyKey: "idem-key-1",
    };
    const res: any = await invokePOST(checkoutRoute, "/api/checkout", body, {
      "x-test-user": "test-user",
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.subtotalCents).toBeGreaterThan(0);
    expect(json.discountCents).toBe(0);

    const order = await prisma.order.findUnique({
      where: { id: json.orderId },
    });
    expect(order).not.toBeNull();
    // stock decremented
    const variant = await prisma.sizeVariant.findFirst({
      where: { productId: product.id, label: "M" },
    });
    expect(variant?.stock).toBe(9);
  });

  test("applies fixed discount", async () => {
    const p = await createBasicProduct({ priceCents: 5000 });
    await addLineToCart(p.id, p.priceCents, undefined, 1);
    await createDiscountFixed("SAVE5", 500);
    const body = {
      shippingAddress: {
        fullName: "Jane",
        line1: "A",
        city: "C",
        postalCode: "99999",
        country: "US",
      },
      email: "jane@example.com",
      discountCode: "SAVE5",
      idempotencyKey: "idem-key-2",
    };
    const res: any = await invokePOST(checkoutRoute, "/api/checkout", body, {
      "x-test-user": "test-user",
    });
    const json = await res.json();
    expect(json.discountCents).toBe(500);
    // total = subtotal - discount + tax + shipping
    expect(json.totalCents).toBe(
      json.subtotalCents -
        500 +
        (json.taxCents || 0) +
        (json.shippingCents || 0)
    );
  });

  test("discount usage increments and then exhausts", async () => {
    const p = await createBasicProduct({ priceCents: 4000 });
    await addLineToCart(p.id, p.priceCents, undefined, 1);
    await prisma.discountCode.create({
      data: { code: "ONETIME", kind: "FIXED", valueCents: 300, usageLimit: 1 },
    });
    const body = {
      shippingAddress: {
        fullName: "U1",
        line1: "1",
        city: "C",
        postalCode: "1",
        country: "US",
      },
      email: "x@y.com",
      discountCode: "ONETIME",
      idempotencyKey: "disc-use-1",
    };
    const first: any = await invokePOST(checkoutRoute, "/api/checkout", body, {
      "x-test-user": "test-user",
    });
    expect(first.status).toBe(200);
    const dc1 = await prisma.discountCode.findUnique({
      where: { code: "ONETIME" },
    });
    expect(dc1?.timesUsed).toBe(1);
    // second attempt should fail (usage exhausted)
    const p2 = await createBasicProduct({ priceCents: 4000 });
    await addLineToCart(p2.id, p2.priceCents, undefined, 1);
    const second: any = await invokePOST(
      checkoutRoute,
      "/api/checkout",
      { ...body, idempotencyKey: "disc-use-2" },
      { "x-test-user": "test-user" }
    );
    expect(second.status).toBe(400);
    const json2 = await second.json();
    expect(json2.error).toBe("discount_exhausted");
  });

  test("idempotency returns same order on repeat key", async () => {
    const p = await createBasicProduct({ priceCents: 3000 });
    await addLineToCart(p.id, p.priceCents, undefined, 1);
    const body = {
      shippingAddress: {
        fullName: "Joe",
        line1: "1",
        city: "T",
        postalCode: "22222",
        country: "US",
      },
      email: "joe@example.com",
      idempotencyKey: "same-key-123",
    };
    const first: any = await invokePOST(checkoutRoute, "/api/checkout", body, {
      "x-test-user": "test-user",
    });
    const firstJson = await first.json();
    const second: any = await invokePOST(checkoutRoute, "/api/checkout", body, {
      "x-test-user": "test-user",
    });
    const secondJson = await second.json();
    expect(secondJson.orderId).toBe(firstJson.orderId);
  });
});
