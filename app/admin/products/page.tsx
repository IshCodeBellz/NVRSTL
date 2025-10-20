import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
// Search is now rendered inside client Filters component
import FiltersClient from "./FiltersClient";

import { formatPriceCents } from "@/lib/money";

import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = (session?.user as { id: string })?.id;
  if (!uid) redirect("/login?callbackUrl=/admin/products");
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.isAdmin) redirect("/");

  const brand =
    typeof searchParams?.brand === "string" ? searchParams?.brand : undefined;
  const category =
    typeof searchParams?.category === "string"
      ? searchParams?.category
      : undefined;
  const includeDeleted = searchParams?.deleted === "1";
  const where = {
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(brand ? { brandId: brand } : {}),
    ...(category ? { categoryId: category } : {}),
  };
  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 150,
    select: {
      id: true,
      sku: true,
      name: true,
      priceCents: true,
      createdAt: true,
      deletedAt: true,
      brand: { select: { name: true, id: true } },
      category: { select: { name: true, id: true } },
    },
  });
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // Calculate stats
  const totalValue = products.reduce((sum: number, p) => sum + p.priceCents, 0);
  const averagePrice = products.length > 0 ? totalValue / products.length : 0;
  const deletedCount = products.filter((p) => p.deletedAt).length;
  const activeCount = products.length - deletedCount;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Product Management
          </h1>
          <p className="text-neutral-600 mt-2">
            Manage your product catalog, inventory, and pricing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="text-sm rounded bg-neutral-200 text-neutral-900 px-3 py-2 hover:bg-neutral-300"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/admin/products/new"
            className="text-sm rounded bg-neutral-900 text-white px-4 py-2 hover:bg-neutral-800"
          >
            New Product
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Products"
          value={products.length.toLocaleString()}
          trend={`${activeCount} active, ${deletedCount} deleted`}
          color="blue"
        />
        <MetricCard
          title="Average Price"
          value={formatPriceCents(averagePrice)}
          trend="Across all products"
          color="green"
        />
        <MetricCard
          title="Total Catalog Value"
          value={formatPriceCents(totalValue)}
          trend="Sum of all product prices"
          color="purple"
        />
        <MetricCard
          title="Unique Brands"
          value={brands.length.toString()}
          trend={`${categories.length} categories`}
          color="yellow"
        />
      </section>

      {/* Filters */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Filter Products</h2>
        <div className="bg-white rounded-lg border p-4">
          <FiltersClient
            brands={brands}
            categories={categories}
            initialBrand={brand}
            initialCategory={category}
            initialIncludeDeleted={includeDeleted}
          />
        </div>
      </section>

      {/* Products Table */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Products ({products.length})</h2>
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Product</th>
                <th className="text-left py-3 px-4 font-medium">SKU</th>
                <th className="text-left py-3 px-4 font-medium">Brand</th>
                <th className="text-left py-3 px-4 font-medium">Category</th>
                <th className="text-left py-3 px-4 font-medium">Price</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium">Created</th>
                <th className="text-left py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(
                (p: {
                  id: string;
                  name: string;
                  sku: string;
                  priceCents: number;
                  createdAt: Date;
                  deletedAt: Date | null;
                  brand: { id: string; name: string } | null;
                  category: { id: string; name: string } | null;
                }) => (
                  <tr key={p.id} className="border-t hover:bg-neutral-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{p.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-neutral-100 px-2 py-1 rounded">
                        {p.sku}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {p.brand?.name || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {p.category?.name || "-"}
                    </td>
                    <td className="py-2 px-4 text-sm text-gray-900">
                      {/* Admin: show canonical stored price (GBP base) without currency conversion */}
                      {formatPriceCents(p.priceCents, { currency: "GBP" })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          p.deletedAt
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {p.deletedAt ? "Deleted" : "Active"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-neutral-500">
                      {p.createdAt.toISOString().split("T")[0]}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              )}
              {products.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 px-4 text-center text-neutral-500"
                  >
                    <div className="space-y-2">
                      <div className="text-lg">No products found</div>
                      <div className="text-sm">
                        Try adjusting your filters or create a new product
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  trend,
  color,
}: {
  title: string;
  value: string;
  trend: string;
  color: "blue" | "green" | "yellow" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    yellow: "bg-yellow-50 border-yellow-200",
    purple: "bg-purple-50 border-purple-200",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium text-neutral-600">{title}</h3>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{trend}</p>
    </div>
  );
}
