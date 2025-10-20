import { NextRequest } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { prismaX } from "@/lib/server/prismaEx";

const TEST_BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

// Lightweight invocation helpers for route handlers without spinning up full Next server
export async function invokeGET(mod: any, url: string) {
  const req = new NextRequest(new URL(url, TEST_BASE));
  return mod.GET(req);
}
export async function invokePOST(
  mod: any,
  url: string,
  body: any,
  headers: Record<string, string> = {}
) {
  const req = new NextRequest(new URL(url, TEST_BASE), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  } as any);
  return mod.POST(req as any);
}

export async function resetDb() {
  const dbUrl = process.env.DATABASE_URL || "";
  // Safety guard: abort if DATABASE_URL looks like production
  const prodPatterns = [
    "railway",
    "prod",
    "nvrstl.com",
    "hopper.proxy.rlwy.net",
  ];
  if (prodPatterns.some((p) => dbUrl.includes(p))) {
    throw new Error(
      `[SAFETY] Refusing to reset a production database: ${dbUrl}`
    );
  }
  // If some test disconnected Prisma, reconnect here so reset can run
  if ((global as any).__prismaDisconnected) {
    try {
      await prisma.$connect();
    } catch (error) {
      console.error("Error:", error);
      // ignore - we'll surface errors later
    }
  }
  // Pre-test DB health check: fail fast if DB is unreachable
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error(
      "[TEST DB ERROR] Could not connect to database. Check DATABASE_URL and DB status.",
      "DATABASE_URL:",
      process.env.DATABASE_URL,
      "Error:",
      error
    );

    // Try to reconnect once before failing
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log("[TEST DB] Reconnection successful");
    } catch (reconnectErr) {
      console.error("[TEST DB ERROR] Reconnection also failed:", reconnectErr);
      throw new Error(
        `[TEST DB ERROR] Could not connect to database. DATABASE_URL: ${process.env.DATABASE_URL}`
      );
    }
  }
  let isSqlite = false;
  if (dbUrl.includes("sqlite")) isSqlite = true;
  else {
    // Probe with PRAGMA to detect sqlite when env var missing in process (but present in generated client).
    try {
      await prisma.$executeRawUnsafe("PRAGMA foreign_keys");
      isSqlite = true;
    } catch {}
  }

  const orderedTables = [
    "PaymentRecord",
    "OrderEvent",
    "OrderItem",
    "Order",
    "CartLine",
    "Cart",
    "WishlistItem",
    "Wishlist",
    "ProductImage",
    "SizeVariant",
    "ProductMetrics",
    "ProcessedWebhookEvent",
    "Address",
    "Product",
    "Brand",
    "Category",
    "DiscountCode",
    "PasswordResetToken",
    "User",
  ];

  if (isSqlite) {
    // Quick short‑circuit: if no orders and no products present assume DB already clean.
    const anyExisting = await prisma.product.findFirst({
      select: { id: true },
    });
    if (!anyExisting) {
      const hasUser = await prisma.user.findFirst({ select: { id: true } });
      if (!hasUser) return; // already empty
    }
    try {
      await prisma.$executeRawUnsafe("PRAGMA foreign_keys = OFF");
      const timings: Array<{ table: string; ms: number }> = [];
      for (const t of orderedTables) {
        const start = Date.now();
        await prisma.$executeRawUnsafe(`DELETE FROM "${t}"`);
        timings.push({ table: t, ms: Date.now() - start });
      }
      if (process.env.TEST_DB_TIMING === "1") {
        console.log(
          "resetDb(sqlite) timings=" +
            timings.map((r) => `${r.table}:${r.ms}ms`).join(",")
        );
      }
    } finally {
      await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON");
    }
    return;
  }

  // Non-sqlite path (e.g., Postgres soon). Use a transaction + two passes for safety.
  try {
    await prisma.$transaction(
      async (tx) => {
        const del = async () => {
          const time = (label: string, fn: () => Promise<any>) => fn();
          await tx.paymentRecord.deleteMany();
          await (prismaX.orderEvent as any).deleteMany();
          await tx.orderItem.deleteMany();
          await tx.order.deleteMany();
          await tx.cartLine.deleteMany();
          await tx.cart.deleteMany();
          await tx.wishlistItem.deleteMany();
          await tx.wishlist.deleteMany();
          await tx.productImage.deleteMany();
          await tx.sizeVariant.deleteMany();
          await tx.productMetrics.deleteMany();
          await tx.processedWebhookEvent.deleteMany();
          await tx.address.deleteMany();
          await tx.product.deleteMany();
          await tx.brand.deleteMany();
          await tx.category.deleteMany();
          await tx.discountCode.deleteMany();
          await (prismaX.passwordResetToken as any).deleteMany();
          await tx.user.deleteMany();
        };
        await del();
        await del(); // second pass (idempotent) cleans up any rows inserted mid-reset (rare)
      },
      {
        timeout: 30000, // Increase timeout to 30 seconds
      }
    );
  } catch (error) {
    console.error(
      "[TEST DB ERROR] Transaction failed during resetDb. Check DB status and logs.",
      error
    );
    throw error;
  }
}

export async function createBasicProduct(
  opts: { priceCents?: number; sizes?: string[] } = {}
) {
  const product = await prisma.product.create({
    data: {
      sku: "SKU" + Math.random().toString(36).slice(2, 8),
      name: "Test Product",
      description: "Desc",
      priceCents: opts.priceCents ?? 5000,
      sizeVariants: {
        create: (opts.sizes || ["M"]).map((label) => ({ label, stock: 10 })),
      },
    },
    include: { sizeVariants: true },
  });
  return product;
}

export async function ensureTestUserAndCart(id: string = "test-user") {
  // Upsert user and cart inside one transaction to avoid FK race conditions
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        email: id + "@example.test",
        passwordHash: "x",
        isAdmin: true,
      },
    });

    const cart = await tx.cart.upsert({
      where: { userId: user.id },
      update: {},
      create: { user: { connect: { id: user.id } } },
    });

    return { user, cart } as const;
  });

  return { user: result.user, cart: result.cart };
}

export async function ensurePaymentRecord(orderId: string) {
  // Helper with a tiny retry loop in case future async separation is introduced.
  for (let i = 0; i < 3; i++) {
    const rec = await prisma.paymentRecord.findFirst({ where: { orderId } });
    if (rec) return rec;
    await new Promise((r) => setTimeout(r, 5));
  }
  return null;
}

export async function createOrderForTest(opts: {
  priceCents?: number;
  qty?: number;
  size?: string;
  idempotencyKey?: string;
  userId?: string;
  removeSimulatedPayments?: boolean;
}) {
  const {
    priceCents = 2500,
    qty = 1,
    size,
    idempotencyKey,
    userId = "test-user",
  } = opts || {};
  const product = await createBasicProduct({
    priceCents,
    sizes: size ? [size] : undefined,
  });
  await addLineToCart(product.id, product.priceCents, size, qty, userId);
  const body = {
    shippingAddress: {
      fullName: "Order T",
      line1: "1",
      city: "C",
      postalCode: "1",
      country: "US",
    },
    email: `${userId}@example.test`,
    idempotencyKey:
      idempotencyKey || "idem-" + Math.random().toString(36).slice(2, 8),
  };
  const res: any = await invokePOST(
    require("@/app/api/checkout/route"),
    "/api/checkout",
    body,
    { "x-test-user": userId, "x-test-bypass-rate-limit": "1" }
  );
  const status = res.status;
  const json = await res.json().catch(() => null);
  if (status !== 200) {
    // Provide detailed failure diagnostics for flaky test runs
    const errBody = json || { status };
    throw new Error(
      `createOrderForTest: checkout failed with status=${status} body=${JSON.stringify(
        errBody
      )}`
    );
  }
  // Optionally remove simulated payment placeholders created by checkout
  if (opts?.removeSimulatedPayments) {
    try {
      await prisma.paymentRecord.deleteMany({
        where: {
          orderId: json?.orderId,
          providerRef: { startsWith: "pi_sim_" },
        },
      });
    } catch (error) {
      console.error("Error:", error);
      // ignore
    }
  }

  return { ...json, product } as {
    orderId: string;
    subtotalCents: number;
    totalCents: number;
    product: any;
  };
}

export async function addLineToCart(
  productId: string,
  priceCents: number,
  size?: string,
  qty = 1,
  userId?: string
) {
  const { cart } = await ensureTestUserAndCart(userId);
  return prisma.cartLine.create({
    data: {
      cartId: cart.id,
      productId,
      size: size || null,
      qty,
      priceCentsSnapshot: priceCents,
    },
  });
}

export async function createDiscountFixed(code: string, valueCents: number) {
  return prisma.discountCode.create({
    data: { code: code.toUpperCase(), kind: "FIXED", valueCents },
  });
}
export async function createDiscountPercent(code: string, percent: number) {
  return prisma.discountCode.create({
    data: { code: code.toUpperCase(), kind: "PERCENT", percent },
  });
}
