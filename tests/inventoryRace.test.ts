import { prisma } from "@/lib/server/prisma";
import { decrementSizeStock } from "@/lib/server/inventory";

// This test simulates many rapid decrements to ensure conditional logic prevents overselling.

describe("inventory race hardening", () => {
  beforeEach(async () => {
    // Ensure dependent rows are cleared first to avoid FK violations
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartLine.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.sizeVariant.deleteMany();
    await prisma.product.deleteMany();
  });

  test("will not oversell size variant", async () => {
    const product = await prisma.product.create({
      data: {
        sku: "RACESKU",
        name: "Race Product",
        description: "Race test",
        priceCents: 1000,
        sizeVariants: { create: [{ label: "M", stock: 10 }] },
      },
      include: { sizeVariants: true },
    });
    const sv = product.sizeVariants[0];

    // Attempt 15 sequential decrements of qty 1 (should only succeed exactly 10 times)
    let successes = 0;
    let failures = 0;
    for (let i = 0; i < 15; i++) {
      const ok = await decrementSizeStock(prisma as any, sv.id, 1);
      if (ok) successes++;
      else failures++;
    }
    const refreshed = await prisma.sizeVariant.findUnique({
      where: { id: sv.id },
    });
    const finalStock = refreshed?.stock ?? -1;
    expect(finalStock).toBe(0);
    expect(successes).toBe(10);
    expect(failures).toBe(5);
  });
});
