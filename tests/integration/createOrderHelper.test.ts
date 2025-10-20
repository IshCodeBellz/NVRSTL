import { resetDb, createOrderForTest } from "../helpers/testServer";
import { prisma } from "@/lib/server/prisma";

beforeEach(async () => {
  await resetDb();
});

// Lightweight smoke test to ensure helper creates an order and payment record consistently.
describe("createOrderForTest helper", () => {
  test("creates order with product and pending payment", async () => {
    const { orderId, subtotalCents, totalCents, product } =
      await createOrderForTest({ priceCents: 1234, qty: 2 });
    expect(orderId).toBeTruthy();
    expect(subtotalCents).toBe(1234 * 2);
    expect(totalCents).toBeGreaterThanOrEqual(subtotalCents); // tax + shipping may add
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true },
    });
    expect(order).not.toBeNull();
    expect(order?.items.length).toBe(1);
    expect(order?.items[0].qty).toBe(2);
    expect(order?.payments.length).toBe(1);
    expect(product.id).toBe(order?.items[0].productId);
  });
});
