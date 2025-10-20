import { prisma } from "@/lib/server/prisma";
import { prismaX } from "@/lib/server/prismaEx";

async function seedBasicOrder(userId: string) {
  const p = await prisma.product.create({
    data: {
      sku: "RETRY-SKU",
      name: "Retry Product",
      description: "desc",
      priceCents: 2500,
      images: { create: { url: "/p.png", position: 0 } },
    },
  });
  const order = await prisma.order.create({
    data: {
      userId,
      status: "PENDING",
      subtotalCents: 2500,
      discountCents: 0,
      taxCents: 0,
      shippingCents: 0,
      totalCents: 2500,
      email: "retry@example.com",
    },
  });
  return { order, product: p };
}

describe("payment retry endpoint", () => {
  const userId = "retry-user";
  beforeAll(async () => {
    await prismaX.orderEvent.deleteMany();
    await prisma.paymentRecord.deleteMany();
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.product.deleteMany({ where: { sku: "RETRY-SKU" } });
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: "retry@example.com",
        passwordHash: "x",
        isAdmin: true,
      },
    });
  });
  it("creates a new payment record and event", async () => {
    const { order } = await seedBasicOrder(userId);
    const res = await fetch("http://localhost:3000/api/payments/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-user": userId },
      body: JSON.stringify({ orderId: order.id }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.paymentId).toBeTruthy();
    const events: any[] = await prismaX.orderEvent.findMany({
      where: { orderId: order.id },
    });
    expect(events.some((e) => e.kind === "PAYMENT_UPDATE")).toBe(true);
  });

  it("rejects retry when order status not retryable", async () => {
    const { order } = await seedBasicOrder(userId);
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });
    const res = await fetch("http://localhost:3000/api/payments/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-user": userId },
      body: JSON.stringify({ orderId: order.id }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("not_retryable");
  });
});
