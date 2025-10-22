import { prisma } from "@/lib/server/prisma";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function AccessoriesPage() {
  // Fetch accessories category and its subcategories from database
  let accessoriesCategory;
  try {
    accessoriesCategory = await prisma.category.findFirst({
      where: { slug: "accessories" },
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
    accessoriesCategory = null;
  }

  const subcategories =
    accessoriesCategory?.children.map((child) => ({
      name: child.name,
      slug: child.slug.replace("accessories-", ""), // Remove prefix for URL
      href: `/accessories/${child.slug.replace("accessories-", "")}`,
      image:
        child.imageUrl ||
        `https://picsum.photos/seed/accessories-${child.slug}/600/800`,
      description: child.description || `${child.name} collection`,
      productCount: child._count.products,
    })) || [];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Accessories</h1>
          <p className="text-gray-500">
            Complete your look with our accessories collection
          </p>
        </div>

        {/* Gender Filter Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <Link
              href="/accessories"
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-white text-gray-900 shadow-sm"
            >
              All Accessories
            </Link>
            <Link
              href="/accessories/mens"
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            >
              Men&apos;s
            </Link>
            <Link
              href="/accessories/womens"
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            >
              Women&apos;s
            </Link>
            <Link
              href="/accessories/unisex"
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            >
              Unisex
            </Link>
          </div>
        </div>

        {/* Subcategories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {subcategories.map((subcategory) => (
            <Link
              key={subcategory.slug}
              href={subcategory.href}
              className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                <Image
                  src={subcategory.image}
                  alt={subcategory.name}
                  width={300}
                  height={300}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-1">
                  {subcategory.name}
                </h3>
                <p className="text-sm text-gray-500 mb-2">
                  {subcategory.description}
                </p>
                <p className="text-sm text-gray-500">
                  {subcategory.productCount} products
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
