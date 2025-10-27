import { describe, test, expect, beforeEach } from "@jest/globals";
// NextRequest import removed
import { resetDb, createOrderForTest } from "../helpers/testServer";
import * as metricsRoute from "@/app/api/metrics/route";
import { prisma } from "@/lib/server/prisma";

beforeEach(async () => {
  await resetDb();
});

describe("metrics endpoint", () => {
  test("returns basic system metrics for empty database", async () => {
    const res = await metricsRoute.GET();
    if (res.status !== 200) {
      const errorData = await res.json();
      console.log("Metrics error:", errorData);
    }
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("system");
    expect(data).toHaveProperty("business");

    // System health checks
    expect(data.system.database.status).toMatch(/healthy|degraded|critical/);
    expect(typeof data.system.database.latency_ms).toBe("number");

    // Business metrics structure
    expect(data.business.orders).toHaveProperty("by_status");
    expect(data.business.orders).toHaveProperty("total_count");
    expect(data.business.orders).toHaveProperty("total_value");
    expect(data.business.payments).toHaveProperty("by_status");

    // Empty database should have zero counts
    expect(data.business.orders.total_count).toBe(0);
    expect(data.business.orders.total_value).toBe(0);
    expect(data.business.payments.total_transactions).toBe(0);
  });

  test("aggregates order and payment metrics correctly", async () => {
    // Clear existing data first
    await prisma.order.deleteMany();
    await prisma.paymentRecord.deleteMany();
    await prisma.product.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.cartLine.deleteMany();

    // Create test data with unique user IDs
    const order1Data = await createOrderForTest({
      userId: "metrics-user-1-unique",
      priceCents: 5000,
      removeSimulatedPayments: true,
    });

    const order2Data = await createOrderForTest({
      userId: "metrics-user-2-unique",
      priceCents: 7500,
      removeSimulatedPayments: true,
    });

    // Update one order to PAID status
    await prisma.order.update({
      where: { id: order2Data.orderId },
      data: { status: "PAID" },
    });

    // Add payment records
    await prisma.paymentRecord.create({
      data: {
        orderId: order1Data.orderId,
        provider: "STRIPE",
        providerRef: "pi_test_1",
        amountCents: 5000,
        status: "PAYMENT_PENDING",
      },
    });

    await prisma.paymentRecord.create({
      data: {
        orderId: order2Data.orderId,
        provider: "STRIPE",
        providerRef: "pi_test_2",
        amountCents: 7500,
        status: "CAPTURED",
      },
    });

    const res = await metricsRoute.GET();
    const data = await res.json();

    // Order metrics
    expect(data.business.orders.total_count).toBe(2);
    expect(data.business.orders.total_value).toBe(
      order1Data.totalCents + order2Data.totalCents
    );
    expect(data.business.orders.by_status.pending.count).toBe(1);
    expect(data.business.orders.by_status.paid.count).toBe(1);
    expect(data.business.orders.by_status.pending.total_value).toBe(
      order1Data.totalCents
    );
    expect(data.business.orders.by_status.paid.total_value).toBe(
      order2Data.totalCents
    );

    // Payment metrics
    expect(data.business.payments.total_transactions).toBe(2);
    expect(data.business.payments.total_processed).toBe(12500); // 5000 + 7500
    expect(data.business.payments.by_status.payment_pending.count).toBe(1);
    expect(data.business.payments.by_status.captured.count).toBe(1);
  });

  test("handles database errors gracefully", async () => {
    // Mock the database query to throw an error
    const originalQueryRaw = prisma.$queryRaw;
    prisma.$queryRaw = jest
      .fn()
      .mockRejectedValue(new Error("Database connection failed"));

    const res = await metricsRoute.GET();
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data).toHaveProperty("error", "metrics_unavailable");
    expect(data.system.database.status).toBe("error");

    // Restore the original method
    prisma.$queryRaw = originalQueryRaw;
  });

  test("includes performance timing in response", async () => {
    const start = Date.now();
    const res = await metricsRoute.GET();
    const end = Date.now();

    const data = await res.json();

    expect(typeof data.request_duration_ms).toBe("number");
    expect(data.request_duration_ms).toBeGreaterThanOrEqual(0); // Allow 0 for very fast responses
    expect(data.request_duration_ms).toBeLessThan(end - start + 100); // Allow some margin
  });
});
