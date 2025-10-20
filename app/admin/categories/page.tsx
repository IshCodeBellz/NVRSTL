import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import CategoriesClient from ".";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Metric Card Component
const MetricCard = ({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) => (
  <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg border border-gray-200">
    <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

export default async function CategoriesAdminPage() {
  const session = await getServerSession(authOptionsEnhanced);
  if (!(session?.user as { isAdmin: boolean })?.isAdmin)
    return <div className="p-6">Unauthorized</div>;

  let categories;
  try {
    // Fetch categories with product counts
    categories = await prisma.category.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: {
        parent: true,
        children: {
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  } catch {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">
            Database Connection Error
          </h3>
          <p className="text-red-600 text-sm mt-1">
            Unable to connect to database. Please check your configuration.
          </p>
          <pre className="text-xs text-red-500 mt-2 overflow-auto">
            Database connection failed
          </pre>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalCategories = categories.length;
  const totalProducts = categories.reduce(
    (sum, category) => sum + category._count.products,
    0
  );
  const avgProductsPerCategory =
    totalCategories > 0 ? Math.round(totalProducts / totalCategories) : 0;
  const activeCategories = categories.filter(
    (category) => category._count.products > 0
  ).length;
  // test
  const mapped = categories
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      parentId: c.parentId,
      displayOrder: c.displayOrder,
      isActive: c.isActive,
      productCount: c._count.products,
      parent: c.parent,
      children: c.children,
    }))
    .sort((a, b) => {
      // First, separate main categories from subcategories
      const aIsMain = !a.parentId;
      const bIsMain = !b.parentId;

      if (aIsMain && !bIsMain) return -1; // Main categories first
      if (!aIsMain && bIsMain) return 1; // Subcategories after

      // If both are main categories, sort by display order then name
      if (aIsMain && bIsMain) {
        if (a.displayOrder !== b.displayOrder)
          return a.displayOrder - b.displayOrder;
        return a.name.localeCompare(b.name);
      }

      // If both are subcategories, group by parent first
      if (!aIsMain && !bIsMain) {
        if (a.parentId !== b.parentId) {
          // Find parent categories to compare their order
          const parentA = categories.find((c) => c.id === a.parentId);
          const parentB = categories.find((c) => c.id === b.parentId);
          if (parentA && parentB) {
            if (parentA.displayOrder !== parentB.displayOrder) {
              return parentA.displayOrder - parentB.displayOrder;
            }
            return parentA.name.localeCompare(parentB.name);
          }
        }
        // Same parent, sort by display order then name
        if (a.displayOrder !== b.displayOrder)
          return a.displayOrder - b.displayOrder;
        return a.name.localeCompare(b.name);
      }

      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Manage Categories
              </h1>
              <p className="text-gray-600 mt-1">
                Organize your products into categories for better navigation
              </p>
            </div>
            <Link
              href="/admin"
              className="text-sm rounded bg-neutral-200 text-neutral-900 px-3 py-2 hover:bg-neutral-300"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Metrics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Categories"
            value={totalCategories}
            subtitle="All categories in system"
          />
          <MetricCard
            title="Active Categories"
            value={activeCategories}
            subtitle="Categories with products"
          />
          <MetricCard
            title="Total Products"
            value={totalProducts}
            subtitle="Across all categories"
          />
          <MetricCard
            title="Avg Products/Category"
            value={avgProductsPerCategory}
            subtitle="Products per category"
          />
        </div>

        {/* Categories Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              All Categories
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage and organize your product categories
            </p>
          </div>
          <div className="p-6">
            <CategoriesClient initial={mapped} />
          </div>
        </div>
      </div>
    </div>
  );
}
