import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/server/prisma";
import { formatPriceCents } from "@/lib/money";
import Image from "next/image";

interface PageProps {
  params: {
    subcategory: string;
  };
  searchParams: {
    sort?: string;
    gender?: string;
    brand?: string;
    priceMin?: string;
    priceMax?: string;
  };
}

export default async function ShoesSubcategoryPage({
  params,
  searchParams,
}: PageProps) {
  const { subcategory } = params;

  // Find the subcategory in the database
  const categorySlug = `shoes-${subcategory}`;
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
  });

  if (!category) {
    notFound();
  }

  // Build filter conditions
  const where: Record<string, unknown> = {
    categoryId: category.id,
    isActive: true,
    deletedAt: null,
  };

  // Apply filters from search params
  if (searchParams.gender) {
    where.gender = searchParams.gender;
  }

  if (searchParams.brand) {
    where.brand = {
      name: {
        contains: searchParams.brand,
        mode: "insensitive",
      },
    };
  }

  if (searchParams.priceMin || searchParams.priceMax) {
    where.priceCents = {};
    if (searchParams.priceMin) {
      (where.priceCents as { gte?: number; lte?: number }).gte =
        parseInt(searchParams.priceMin) * 100;
    }
    if (searchParams.priceMax) {
      (where.priceCents as { gte?: number; lte?: number }).lte =
        parseInt(searchParams.priceMax) * 100;
    }
  }

  // Build sort order
  let orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" }; // default
  switch (searchParams.sort) {
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
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
  }

  // Fetch products
  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      brand: true,
      images: {
        where: { position: 0 },
        take: 1,
      },
    },
    take: 50, // Limit for performance
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-gray-700">
            Home
          </Link>
          <span>/</span>
          <Link href="/shoes" className="hover:text-gray-700">
            Shoes
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{category.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {category.name}
          </h1>
          <p className="text-gray-500 mt-2">
            {products.length} {products.length === 1 ? "product" : "products"}{" "}
            found
          </p>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {product.images[0] ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.images[0].alt || product.name}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  {product.brand && (
                    <p className="text-sm text-gray-500 mb-2">
                      {product.brand.name}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900">
                        {formatPriceCents(product.priceCents)}
                      </span>
                      {product.comparePriceCents && (
                        <span className="text-sm text-gray-500 line-through">
                          {formatPriceCents(product.comparePriceCents)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m0 0V9a2 2 0 012-2h2m0 0V6a2 2 0 012-2h2m0 0V6a2 2 0 012-2h2m0 0v1"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-500">
              There are no products in this category yet. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { subcategory } = params;
  const categorySlug = `shoes-${subcategory}`;

  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
  });

  if (!category) {
    return {
      title: "Category Not Found",
    };
  }

  return {
    title: `${category.name} - Shoes | DY Official`,
    description: `Shop ${category.name} at DY Official`,
  };
}
