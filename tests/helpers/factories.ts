import { prisma } from "@/lib/server/prisma";

// Centralized lightweight factories to reduce duplication in tests.
// These intentionally keep logic minimal; compose them inside tests for scenarios.

export async function createUser(
  opts: { id?: string; email?: string; isAdmin?: boolean } = {}
) {
  const id = opts.id || "user_" + Math.random().toString(36).slice(2, 8);
  return prisma.user.create({
    data: {
      id,
      email: opts.email || id + "@example.com",
      passwordHash: "x",
      isAdmin: !!opts.isAdmin,
    },
  });
}

export async function createProduct(
  opts: {
    sku?: string;
    priceCents?: number;
    name?: string;
    description?: string;
    sizes?: { label: string; stock?: number }[];
    images?: { url: string; alt?: string; position?: number }[];
  } = {}
) {
  const sku = opts.sku || "SKU" + Math.random().toString(36).slice(2, 8);
  return prisma.product.create({
    data: {
      sku,
      name: opts.name || "Test Product",
      description: opts.description || "Test Description",
      priceCents: opts.priceCents ?? 5000,
      images: {
        create: (
          opts.images || [
            { url: "https://example.com/" + sku + ".png", alt: "img" },
          ]
        ).map((i, idx) => ({
          position: i.position ?? idx,
          alt: i.alt,
          url: i.url,
        })),
      },
      sizeVariants: opts.sizes
        ? {
            create: opts.sizes.map((s) => ({
              label: s.label,
              stock: s.stock ?? 10,
            })),
          }
        : undefined,
    },
    include: { sizeVariants: true, images: true },
  });
}

export async function ensureCart(userId: string) {
  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) cart = await prisma.cart.create({ data: { userId } });
  return cart;
}

export async function addCartLine(
  userId: string,
  productId: string,
  priceCents: number,
  qty = 1,
  size?: string
) {
  const cart = await ensureCart(userId);
  return prisma.cartLine.create({
    data: {
      cartId: cart.id,
      productId,
      priceCentsSnapshot: priceCents,
      qty,
      size: size || null,
    },
  });
}

export async function createDiscountFixed(
  code: string,
  valueCents: number,
  opts: { minSubtotalCents?: number; usageLimit?: number } = {}
) {
  return prisma.discountCode.create({
    data: {
      code: code.toUpperCase(),
      kind: "FIXED",
      valueCents,
      minSubtotalCents: opts.minSubtotalCents,
      usageLimit: opts.usageLimit,
    },
  });
}

export async function createDiscountPercent(
  code: string,
  percent: number,
  opts: { minSubtotalCents?: number; usageLimit?: number } = {}
) {
  return prisma.discountCode.create({
    data: {
      code: code.toUpperCase(),
      kind: "PERCENT",
      percent,
      minSubtotalCents: opts.minSubtotalCents,
      usageLimit: opts.usageLimit,
    },
  });
}

export async function createOrderSkeleton(
  opts: { userId?: string; totalCents?: number; status?: string } = {}
) {
  const userId = opts.userId || (await createUser()).id;
  const total = opts.totalCents ?? 5000;
  return prisma.order.create({
    data: {
      userId,
      email: userId + "@example.com",
      subtotalCents: total,
      discountCents: 0,
      taxCents: 0,
      shippingCents: 0,
      totalCents: total,
      status: opts.status || "PENDING",
    },
  });
}
