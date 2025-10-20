import {
  invokePOST,
  resetDb,
  createBasicProduct,
  addLineToCart,
  createDiscountFixed,
} from "../helpers/testServer";
import * as checkoutRoute from "@/app/api/checkout/route";
import { prisma } from "@/lib/server/prisma";

beforeEach(async () => {
  await resetDb();
});

const hdr = { "x-test-user": "test-user", "x-test-bypass-rate-limit": "1" };

function baseAddress() {
  return {
    fullName: "Fail Case",
    line1: "1",
    city: "X",
    postalCode: "00000",
    country: "US",
  };
}

describe("checkout failure scenarios", () => {
  test("empty cart returns 400", async () => {
    const body = {
      shippingAddress: baseAddress(),
      email: "a@b.com",
      idempotencyKey: "fail-empty-1",
    };
    const res: any = await invokePOST(
      checkoutRoute,
      "/api/checkout",
      body,
      hdr
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("empty_cart");
  });

  test("stock conflict", async () => {
    const p = await createBasicProduct({ priceCents: 1000, sizes: ["M"] });
    await addLineToCart(p.id, p.priceCents, "M", 15); // greater than stock 10
    const body = {
      shippingAddress: baseAddress(),
      email: "a@b.com",
      idempotencyKey: "fail-stock-1",
    };
    const res: any = await invokePOST(
      checkoutRoute,
      "/api/checkout",
      body,
      hdr
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("stock_conflict");
    expect(json.stockErrors.length).toBe(1);
  });

  test("invalid discount", async () => {
    const p = await createBasicProduct({ priceCents: 2000 });
    await addLineToCart(p.id, p.priceCents, undefined, 1);
    const body = {
      shippingAddress: baseAddress(),
      email: "a@b.com",
      idempotencyKey: "fail-disc-1",
      discountCode: "NOTREAL",
    };
    const res: any = await invokePOST(
      checkoutRoute,
      "/api/checkout",
      body,
      hdr
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_discount");
  });

  test("discount min subtotal unmet", async () => {
    const p = await createBasicProduct({ priceCents: 1000 }); // subtotal = 1000
    await addLineToCart(p.id, p.priceCents, undefined, 1);
    await prisma.discountCode.create({
      data: {
        code: "BIGSAVE",
        kind: "FIXED",
        valueCents: 500,
        minSubtotalCents: 5000,
      },
    });
    const body = {
      shippingAddress: baseAddress(),
      email: "a@b.com",
      idempotencyKey: "fail-disc-2",
      discountCode: "BIGSAVE",
      // Provide lines fallback to prevent any possibility of cart missed in rare rebuild case
      lines: [
        {
          productId: p.id,
          size: undefined,
          qty: 1,
        },
      ],
    };
    const res: any = await invokePOST(
      checkoutRoute,
      "/api/checkout",
      body,
      hdr
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("discount_min_subtotal");
  });

  test("discount usage exhausted", async () => {
    const p = await createBasicProduct({ priceCents: 1500 });
    await prisma.discountCode.create({
      data: {
        code: "ONCE",
        kind: "FIXED",
        valueCents: 200,
        usageLimit: 1,
        timesUsed: 1,
      },
    });
    await addLineToCart(p.id, p.priceCents, undefined, 1);
    const body = {
      shippingAddress: baseAddress(),
      email: "a@b.com",
      idempotencyKey: "fail-disc-3",
      discountCode: "ONCE",
    };
    const res: any = await invokePOST(
      checkoutRoute,
      "/api/checkout",
      body,
      hdr
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("discount_exhausted");
  });
});
