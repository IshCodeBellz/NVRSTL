import { prisma } from "@/lib/server/prisma";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function ShoesPage() {
  // Fetch shoes category and its subcategories from database
  let shoesCategory;
  try {
    shoesCategory = await prisma.category.findFirst({
      where: { slug: "shoes" },
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
    shoesCategory = null;
  }

  const subcategories =
    shoesCategory?.children.map((child) => ({
      name: child.name,
      slug: child.slug.replace("shoes-", ""), // Remove prefix for URL
      href: `/shoes/${child.slug.replace("shoes-", "")}`,
      image:
        child.imageUrl ||
        `https://picsum.photos/seed/shoes-${child.slug}/600/800`,
      description: child.description || `${child.name} collection`,
      productCount: child._count.products,
    })) || [];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Footwear</h1>
          <p className="text-gray-500">
            Discover our complete collection of shoes
          </p>
        </div>

        {/* Gender Sections */}
        <div className="space-y-12">
          {/* Men&apos;s Shoes */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                Men&apos;s Shoes
              </h2>
              <Link
                href="/shoes/mens"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All Men&apos;s Shoes →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {subcategories.slice(0, 4).map((subcategory) => (
                <Link
                  key={subcategory.slug}
                  href={`/shoes/mens/${subcategory.slug}`}
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
                      Men&apos;s {subcategory.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {subcategory.productCount} products
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Women&apos;s Shoes */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                Women&apos;s Shoes
              </h2>
              <Link
                href="/shoes/womens"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All Women&apos;s Shoes →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {subcategories.slice(0, 4).map((subcategory) => (
                <Link
                  key={subcategory.slug}
                  href={`/shoes/womens/${subcategory.slug}`}
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
                      Women&apos;s {subcategory.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {subcategory.productCount} products
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
