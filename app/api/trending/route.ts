import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";

interface TrendingItem {
  id: string;
  name: string;
  priceCents: number;
  image: string | null;
  createdAt: Date;
  views: number;
  detailViews: number;
  wishlists: number;
  addToCart: number;
  purchases: number;
  score: number;
}

// Basic trending scoring with time decay
const HALF_LIFE_HOURS = 72; // tune as needed

export async function GET() {
  try {
    // Raw SQL for scoring (PostgreSQL)
    const items: TrendingItem[] = await prisma.$queryRawUnsafe(`
      SELECT
        p.id,
        p.name,
        p."priceCents",
        (SELECT url FROM "ProductImage" WHERE "productId" = p.id ORDER BY position ASC LIMIT 1) as image,
        p."createdAt",
        COALESCE(m.views,0) as views,
        COALESCE(m."detailViews",0) as "detailViews",
        COALESCE(m.wishlists,0) as wishlists,
        COALESCE(m."addToCart",0) as "addToCart",
        COALESCE(m.purchases,0) as purchases,
        (
          (0.5 * COALESCE(m.views,0)) +
          (1.0 * COALESCE(m."detailViews",0)) +
          (1.3 * COALESCE(m.wishlists,0)) +
          (2.2 * COALESCE(m."addToCart",0)) +
          (4.0 * COALESCE(m.purchases,0))
        ) *
        (1.0 / (1.0 + ((EXTRACT(EPOCH FROM NOW()) - EXTRACT(EPOCH FROM p."createdAt")) / (3600.0 * ${HALF_LIFE_HOURS}))))
        AS score
      FROM "Product" p
      LEFT JOIN "ProductMetrics" m ON m."productId" = p.id
      WHERE p."isActive" = true AND p."deletedAt" IS NULL
      ORDER BY score DESC
      LIMIT 12;
    `);

    const hasMeaningful = items.some((i) => i.score && i.score > 0);
    if (items.length === 0 || !hasMeaningful) {
      // Fallback: newest products ordered by createdAt
      const latest = await prisma.product.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          name: true,
          priceCents: true,
          createdAt: true,
          images: {
            select: { url: true },
            orderBy: { position: "asc" },
            take: 1,
          },
        },
      });
      return NextResponse.json({
        items: latest.map((p) => ({
          id: p.id,
          name: p.name,
          priceCents: p.priceCents,
          // first image or placeholder
          image: p.images[0]?.url || "/placeholder.svg",
          fallback: true,
        })),
      });
    }

    return NextResponse.json({ items });
  } catch (error) {
    logger.error("Error:", error);
    // On hard failure also fallback so homepage stays resilient
    try {
      const latest = await prisma.product.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          name: true,
          priceCents: true,
          images: {
            select: { url: true },
            orderBy: { position: "asc" },
            take: 1,
          },
        },
      });
      return NextResponse.json({
        items: latest.map((p) => ({
          id: p.id,
          name: p.name,
          priceCents: p.priceCents,
          image: p.images[0]?.url || "/placeholder.svg",
          fallback: true,
        })),
      });
    } catch {}
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}

export const runtime = "nodejs";
