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
          {items.map(
            (
              p: {
                id: string;
                name: string;
                priceCents: number;
                image: string;
                fallback?: boolean;
              },
              i: number
            ) => (
              <Link
                key={p.id}
                href={`/product/${p.id}`}
                className="group relative bg-gray-800 aspect-[3/4] overflow-hidden rounded-lg border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:shadow-gray-900/50"
              >
                {!p.fallback && (
                  <div className="absolute top-3 left-3 z-10 text-xs font-bold bg-white text-black px-3 py-1.5 rounded-full shadow-lg font-carbon">
                    #{i + 1}
                  </div>
                )}
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="(max-width:768px) 50vw, (max-width:1200px) 20vw, 15vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
                  <div className="font-bold text-white text-sm truncate font-carbon uppercase tracking-wide mb-2">
                    {p.name}
                  </div>
                  <div className="text-white">
                    <ClientPrice
                      cents={p.priceCents}
                      size="sm"
                      className="text-white font-bold font-carbon"
                    />
                  </div>
                </div>
              </Link>
            )
          )}
        </div>
      </div>
    </section>
  );
}
