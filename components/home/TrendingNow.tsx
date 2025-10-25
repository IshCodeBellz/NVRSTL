import { prisma } from "@/lib/server/prisma";
import { InteractiveProductCard } from "@/components/product/InteractiveProductCard";

// Basic trending scoring with time decay
const HALF_LIFE_HOURS = 72;

interface TrendingItem {
  id: string;
  name: string;
  priceCents: number;
  image: string;
  createdAt?: Date;
  views?: number;
  detailViews?: number;
  wishlists?: number;
  addToCart?: number;
  purchases?: number;
  score?: number;
  fallback?: boolean;
}

export async function TrendingNow() {
  let items: TrendingItem[] = [];
  try {
    // Raw SQL for scoring (PostgreSQL) - directly from database
    const rawItems: TrendingItem[] = await prisma.$queryRawUnsafe(`
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

    const hasMeaningful = rawItems.some((i) => i.score && i.score > 0);
    if (rawItems.length === 0 || !hasMeaningful) {
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
      items = latest.map(
        (p: {
          id: string;
          name: string;
          priceCents: number;
          images: Array<{ url: string }>;
        }) => ({
          id: p.id,
          name: p.name,
          priceCents: p.priceCents,
          image: p.images[0]?.url || "/placeholder.svg",
          fallback: true,
        })
      );
    } else {
      items = rawItems.map((item) => ({
        ...item,
        image: item.image || "/placeholder.svg",
      }));
    }
  } catch {
    // Database error occurred
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
      items = latest.map(
        (p: {
          id: string;
          name: string;
          priceCents: number;
          images: Array<{ url: string }>;
        }) => ({
          id: p.id,
          name: p.name,
          priceCents: p.priceCents,
          image: p.images[0]?.url || "/placeholder.svg",
          fallback: true,
        })
      );
    } catch {
      // Fallback error occurred
    }
  }

  if (!items.length) return null;
  return (
    <section className="bg-black py-20">
      <div className="container mx-auto px-8">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-carbon">
              {items[0]?.fallback ? "Latest Products" : "Trending Now"}
            </h2>
            {!items[0]?.fallback && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm uppercase tracking-wider text-gray-400 font-carbon">
                  Live Activity
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {items.map((p, i) => (
            <InteractiveProductCard
              key={p.id}
              product={{
                id: p.id,
                name: p.name,
                priceCents: p.priceCents,
                image: p.image,
              }}
              variant="portrait"
              showRanking={!p.fallback}
              ranking={i + 1}
              showActions={false}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
