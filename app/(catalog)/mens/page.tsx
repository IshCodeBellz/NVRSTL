import { SubcategoriesGrid } from "@/components/layout/SubcategoriesGrid";
import { prisma } from "@/lib/server/prisma";
import { ProductCard } from "@/components/product/ProductCard";
import NextDynamic from "next/dynamic";

// Client-only filters UI (shows a sidebar/modal with mock filters but updates URL)
const SearchFilters = NextDynamic(
  () => import("@/components/search/SearchFilters"),
  {
    ssr: false,
  }
);

export const dynamic = "force-dynamic";

export default async function MensPage({
  searchParams,
}: {
  searchParams?: {
    sort?: string;
    brand?: string;
    price?: string; // e.g. "0-25", "25-50", "50-100", "100+"
    priceMin?: string;
    priceMax?: string;
  };
}) {
  // Fetch mens category and its subcategories from database
  let mensCategory;
  try {
    mensCategory = await prisma.category.findFirst({
      where: { slug: "mens" },
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
    mensCategory = null;
  }

  const subcategories =
    mensCategory?.children.map((child) => ({
      name: child.name,
      slug: child.slug.replace("mens-", ""), // Remove prefix for URL
      href: `/mens/${child.slug.replace("mens-", "")}`,
      image:
        child.imageUrl ||
        `https://picsum.photos/seed/mens-${child.slug}/600/800`,
      description: child.description || `${child.name} collection`,
      productCount: child._count.products,
    })) || [];

  // Build top-level products query for Men's page
  const where: Record<string, unknown> = {
    isActive: true,
    deletedAt: null,
    gender: { in: ["men", "unisex"] },
  };
  const sp = searchParams || {};
  // Parse price range either from priceMin/priceMax or a combined price token
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
    where.priceCents = {};
    if (minCents != null) (where.priceCents as { gte: number }).gte = minCents;
    if (maxCents != null) (where.priceCents as { lte: number }).lte = maxCents;
  }
  if (sp.brand) {
    where.brand = { name: { contains: sp.brand, mode: "insensitive" } };
  }

  // Sort
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
  const baseFilter: Record<string, unknown> = { ...where };
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
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 to-black py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white font-carbon mb-6">
              MEN&apos;S FASHION
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto font-carbon">
              Discover our curated collection of men&apos;s fashion and
              accessories.
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <div className="space-y-10">
        <SubcategoriesGrid
          title="Men's Fashion"
          subcategories={subcategories}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="lg:col-span-3">
              {/* Filters sidebar (client) */}
              <SearchFilters
                facets={{ categories: categoryCounts, brands: brandCounts }}
              />
            </aside>
            <section className="lg:col-span-9">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white font-carbon">
                  Products
                </h2>
                <p className="text-sm text-gray-400 font-carbon">
                  {products.length} result{products.length === 1 ? "" : "s"}
                </p>
              </div>
              {products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={{
                        id: p.id,
                        name: p.name,
                        priceCents: p.priceCents,
                        image: p.images[0]?.url || "",
                        images: p.images,
                        brand: p.brand,
                      }}
                      variant="square"
                      theme="dark"
                      showBrand={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 font-carbon">
                  No products found.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
