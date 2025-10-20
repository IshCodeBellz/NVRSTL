import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { withRequest } from "@/lib/server/logger";
import { getSessionUserId } from "@/lib/server";

// GET wishlist items
export const GET = withRequest(async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req).catch(() => null);
  if (!userId) return NextResponse.json({ items: [] });
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      items: {
        // Product relation: images + sizeVariants (SizeVariant model). There is no 'sizes' include in Product.
        include: { product: { include: { images: true, sizeVariants: true } } },
      },
    },
  });
  return NextResponse.json({
    items: (wishlist?.items || []).map((i) => ({
      id: i.id,
      productId: i.productId,
      size: i.size,
      product: {
        id: i.product.id,
        name: i.product.name,
        priceCents: i.product.priceCents,
        sku: i.product.sku,
        images: i.product.images,
        sizes: i.product.sizeVariants
          ? i.product.sizeVariants.map((sv) => sv.label)
          : [],
      },
    })),
  });
});

// POST add item { productId, size? }
export const POST = withRequest(async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req).catch(() => null);
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { productId, size }: { productId?: string; size?: string | null } =
    body || {};
  if (!productId)
    return NextResponse.json({ error: "missing_product" }, { status: 400 });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const wishlist = await prisma.wishlist.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  await prisma.$transaction(async (tx) => {
    // Prisma composite unique where does not accept null union easily; branch logic
    if (size) {
      await tx.wishlistItem.upsert({
        where: {
          wishlistId_productId_size: {
            wishlistId: wishlist.id,
            productId,
            size,
          },
        },
        update: {},
        create: { wishlistId: wishlist.id, productId, size },
      });
    } else {
      // Handle null size case - upsert doesn't work well with null in composite keys
      const existing = await tx.wishlistItem.findFirst({
        where: {
          wishlistId: wishlist.id,
          productId,
          size: null,
        },
      });
      if (!existing) {
        await tx.wishlistItem.create({
          data: { wishlistId: wishlist.id, productId, size: null },
        });
      }
    }
    await tx.$executeRawUnsafe(
      `INSERT INTO ProductMetrics (productId, views, detailViews, wishlists, addToCart, purchases, updatedAt)
       VALUES (?, 0, 0, 1, 0, 0, CURRENT_TIMESTAMP)
       ON CONFLICT(productId) DO UPDATE SET wishlists = wishlists + 1, updatedAt = CURRENT_TIMESTAMP;`,
      productId
    );
  });

  return NextResponse.json({ ok: true });
});

// DELETE remove item (expects productId + optional size in query)
export const DELETE = withRequest(async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId(req).catch(() => null);
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const sizeParam = searchParams.get("size");
  const size = sizeParam === null || sizeParam === "" ? null : sizeParam;
  if (!productId)
    return NextResponse.json({ error: "missing_product" }, { status: 400 });

  const wishlist = await prisma.wishlist.findUnique({ where: { userId } });
  if (!wishlist) return NextResponse.json({ ok: true }); // nothing to delete

  try {
    if (size) {
      await prisma.wishlistItem.delete({
        where: {
          wishlistId_productId_size: {
            wishlistId: wishlist.id,
            productId,
            size,
          },
        },
      });
    } else {
      // Handle null size case - find the item first, then delete
      const existing = await prisma.wishlistItem.findFirst({
        where: {
          wishlistId: wishlist.id,
          productId,
          size: null,
        },
      });
      if (existing) {
        await prisma.wishlistItem.delete({
          where: { id: existing.id },
        });
      }
    }
  } catch {
    // ignore if not exists
  }
  return NextResponse.json({ ok: true });
});
