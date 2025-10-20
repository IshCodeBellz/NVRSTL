import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import BrandsClient from "./table.client";
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
  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-gray-200">
    <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

export default async function BrandsAdminPage() {
  const session = await getServerSession(authOptionsEnhanced);
  if (!(session?.user as { isAdmin: boolean })?.isAdmin)
    return <div className="p-6">Unauthorized</div>;

  // Fetch brands with statistics
  const brands = await prisma.brand.findMany({
    orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  // Calculate metrics
  const totalBrands = brands.length;
  const featuredBrands = brands.filter((brand) => brand.isFeatured).length;
  const totalProducts = brands.reduce(
    (sum, brand) => sum + brand._count.products,
    0
  );
  const avgProductsPerBrand =
    totalBrands > 0 ? Math.round(totalProducts / totalBrands) : 0;
  const activeBrands = brands.filter(
    (brand) => brand._count.products > 0
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Manage Brands
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your product brands and their associated products
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Total Brands"
            value={totalBrands}
            subtitle="All brands in system"
          />
          <MetricCard
            title="Featured Brands"
            value={featuredBrands}
            subtitle="Highlighted brands"
          />
          <MetricCard
            title="Active Brands"
            value={activeBrands}
            subtitle="Brands with products"
          />
          <MetricCard
            title="Total Products"
            value={totalProducts}
            subtitle="Across all brands"
          />
          <MetricCard
            title="Avg Products/Brand"
            value={avgProductsPerBrand}
            subtitle="Products per brand"
          />
        </div>

        {/* Brands Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Brands</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage and organize your product brands
            </p>
          </div>
          <div className="p-6">
            <BrandsClient
              initial={brands.map((b) => ({
                id: b.id,
                name: b.name,
                logoUrl: b.logoUrl,
                backgroundImage: b.backgroundImage,
                description: b.description,
                isFeatured: b.isFeatured,
                displayOrder: b.displayOrder,
                productCount: b._count.products,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
