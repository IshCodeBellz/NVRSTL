import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/server/prisma";
import { ClientPrice } from "@/components/ui/ClientPrice";

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
      items = latest.map((p) => ({
        id: p.id,
        name: p.name,
        priceCents: p.priceCents,
        image: p.images[0]?.url || "/placeholder.svg",
        fallback: true,
      }));
    } else {
      items = rawItems.map((item) => ({
        ...item,
        image: item.image || "/placeholder.svg",
      }));
    }
  } catch (error) {
    
    console.log("TrendingNow database error:", error);
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
      items = latest.map((p) => ({
        id: p.id,
        name: p.name,
        priceCents: p.priceCents,
        image: p.images[0]?.url || "/placeholder.svg",
        fallback: true,
      }));
    } catch (fallbackError) {
      console.log("TrendingNow fallback error:", fallbackError);
    }
  }

  if (!items.length) return null;
  return (
    <section className="container mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">
          {items[0]?.fallback ? "Latest Products" : "Trending Now"}
        </h2>
        {!items[0]?.fallback && (
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">
            Live Activity
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((p, i: number) => (
          <Link
            key={p.id}
            href={`/product/${p.id}`}
            className="group relative bg-neutral-100 aspect-[3/4] overflow-hidden rounded"
          >
            {!p.fallback && (
              <div className="absolute top-1 left-1 z-10 text-[11px] font-semibold bg-white/90 backdrop-blur px-1.5 py-0.5 rounded shadow">
                #{i + 1}
              </div>
            )}
            <Image
              src={p.image}
              alt={p.name}
              fill
              sizes="(max-width:768px) 50vw, (max-width:1200px) 20vw, 15vw"
              className="object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
              <div className="font-semibold truncate">{p.name}</div>
              <div className="text-white">
                <ClientPrice
                  cents={p.priceCents}
                  size="sm"
                  className="text-white"
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
