import { SubcategoriesGrid } from "@/components/layout/SubcategoriesGrid";
import { prisma } from "@/lib/server/prisma";
import Link from "next/link";
import Image from "next/image";
import { ClientPrice } from "@/components/ui/ClientPrice";
import NextDynamic from "next/dynamic";

const SearchFilters = NextDynamic(
  () => import("@/components/search/SearchFilters"),
  {
    ssr: false,
  }
);

export const dynamic = "force-dynamic";

export default async function WomensPage({
  searchParams,
}: {
  searchParams?: {
    sort?: string;
    brand?: string;
    price?: string;
    priceMin?: string;
    priceMax?: string;
  };
}) {
  // Fetch womens category and its subcategories from database
  let womensCategory;
  try {
    womensCategory = await prisma.category.findFirst({
      where: { slug: "womens" },
      include: {
        children: {
          where: { isActive: true },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          include: {
            _count: {
              select: { products: true },
            },
          },
        },
      },
    });
  } catch {
    womensCategory = null;
  }

  const subcategories =
    womensCategory?.children.map((child) => ({
      name: child.name,
      slug: child.slug.replace("womens-", ""), // Remove prefix for URL
      href: `/womens/${child.slug.replace("womens-", "")}`,
      image:
        child.imageUrl ||
        `https://picsum.photos/seed/womens-${child.slug}/600/800`,
      description: child.description || `${child.name} collection`,
      productCount: child._count.products,
    })) || [];

  // Build top-level products query for Women's page
  const where: any = {
    isActive: true,
    deletedAt: null,
    gender: { in: ["women", "unisex"] },
  };
  const sp = searchParams || {};
  let minCents: number | undefined;
  let maxCents: number | undefined;
  if (sp.priceMin) minCents = Math.max(0, parseInt(sp.priceMin, 10) || 0) * 100;
  if (sp.priceMax) maxCents = Math.max(0, parseInt(sp.priceMax, 10) || 0) * 100;
  if (!sp.priceMin && !sp.priceMax && sp.price) {
    const token = sp.price.trim();
    if (/^\d+\-\d+$/.test(token)) {
      const [lo, hi] = token.split("-").map((n) => parseInt(n, 10));
      if (!Number.isNaN(lo)) minCents = lo * 100;
      if (!Number.isNaN(hi)) maxCents = hi * 100;
    } else if (/^\d+\+$/.test(token)) {
      const lo = parseInt(token.replace("+", ""), 10);
      if (!Number.isNaN(lo)) minCents = lo * 100;
    }
  }
  if (minCents != null || maxCents != null) {
    where.priceCents = {} as any;
    if (minCents != null) (where.priceCents as any).gte = minCents;
    if (maxCents != null) (where.priceCents as any).lte = maxCents;
  }
  if (sp.brand) {
    where.brand = { name: { contains: sp.brand, mode: "insensitive" } };
  }

  let orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" };
  switch (sp.sort) {
    case "price-asc":
      orderBy = { priceCents: "asc" };
      break;
    case "price-desc":
      orderBy = { priceCents: "desc" };
      break;
    case "name-asc":
      orderBy = { name: "asc" };
      break;
    case "name-desc":
      orderBy = { name: "desc" };
      break;
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
  }

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      brand: true,
      images: { orderBy: { position: "asc" }, take: 1 },
    },
    take: 48,
  });

  // Build facets (categories and brands) scoped to current gender filter
  const [allCategories, allBrands] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true, name: true } }),
    prisma.brand.findMany({ select: { id: true, name: true } }),
  ]);
  const baseFilter: any = { ...where };
  delete baseFilter.categoryId;
  delete baseFilter.brand;
  const [categoryCounts, brandCounts] = await Promise.all([
    Promise.all(
      allCategories.map(async (c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        count: await prisma.product.count({
          where: { ...baseFilter, category: { slug: c.slug } },
        }),
      }))
    ),
    Promise.all(
      allBrands.map(async (b) => ({
        id: b.id,
        name: b.name,
        count: await prisma.product.count({
          where: { ...baseFilter, brandId: b.id },
        }),
      }))
    ),
  ]);

  return (
    <div className="space-y-10">
      <SubcategoriesGrid
        title="Women's Fashion"
        subcategories={subcategories}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3">
            <SearchFilters
              facets={{ categories: categoryCounts, brands: brandCounts }}
            />
          </aside>
          <section className="lg:col-span-9">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Products</h2>
              <p className="text-sm text-gray-500">
                {products.length} result{products.length === 1 ? "" : "s"}
              </p>
            </div>
            {products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((p) => (
                  <Link
                    href={`/product/${p.id}`}
                    key={p.id}
                    className="group block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {p.images[0]?.url ? (
                        <Image
                          src={p.images[0].url}
                          alt={p.images[0].alt || p.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">
                        {p.name}
                      </h3>
                      {p.brand?.name && (
                        <p className="text-xs text-gray-500 mb-1">
                          {p.brand.name}
                        </p>
                      )}
                      <div className="text-sm font-semibold">
                        <ClientPrice cents={p.priceCents} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">No products found.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
