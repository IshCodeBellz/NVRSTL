import { prisma } from "@/lib/server/prisma";
import * as statusRoute from "@/app/api/admin/orders/[id]/status/route";
import { NextRequest } from "next/server";
import { resetDb } from "../helpers/testServer";

beforeEach(async () => {
  await resetDb();
});

async function createOrderForUser() {
  // Minimal order creation: create product + cart line + direct order via prisma for isolation
  const user = await prisma.user.create({
    data: {
      id: "status-user",
      email: "status@example.com",
      passwordHash: "x",
      isAdmin: true,
    },
  });
  const prod = await prisma.product.create({
    data: {
      sku: "STATSKU",
      name: "Status Prod",
      description: "d",
      priceCents: 1000,
    },
  });
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      email: user.email,
      subtotalCents: 1000,
      discountCents: 0,
      taxCents: 0,
      shippingCents: 0,
      totalCents: 1000,
      status: "PENDING",
    },
  });
  return order.id;
}

function makeReq(orderId: string, to: string) {
  const body = JSON.stringify({ status: to });
  return new NextRequest(
    new URL(`http://localhost:3000/api/admin/orders/${orderId}/status`),
    {
      method: "POST",
      body,
      headers: {
        "content-type": "application/json",
        "x-test-user": "test-user",
      },
    } as any
  );
}

describe("order status transition guard", () => {
  test("rejects invalid transition PENDING -> SHIPPED", async () => {
    const id = await createOrderForUser();
    const req = makeReq(id, "SHIPPED");
    const res: any = await (statusRoute as any).POST(req, { params: { id } });
    expect(res.status).toBe(400);
    const json = await res.json();
    // Service now returns a descriptive error string including allowed transitions
    expect(typeof json.error).toBe("string");
    expect(json.error).toMatch(/Invalid transition/i);
  });
});
