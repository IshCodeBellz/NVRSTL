import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { ClientPrice } from "@/components/ui/ClientPrice";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import RestoreProductButton from "./restoreButton";
import TriggerDailyReportButton from "./TriggerDailyReportButton";

// Revalidate dashboard every 60s (counts + low stock); remove if you prefer fully dynamic.
export const revalidate = 60;

export default async function AdminHomePage() {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = (session?.user as { id: string })?.id;
  if (!uid) redirect("/login?callbackUrl=/admin");
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.isAdmin) redirect("/");

  const LOW_STOCK_THRESHOLD = 5; // adjust threshold as needed
  const [counts, recentProducts, lowStock, recentDeleted] = await Promise.all([
    // Use interactive transaction for a consistent snapshot of counts.
    // Remove explicit type annotation so Prisma's expected transactional client type is inferred.
    prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const productCount = await tx.product.count({
        where: { deletedAt: null },
      });
      const deletedCount = await tx.product.count({
        where: { deletedAt: { not: null } },
      });
      const brandCount = await tx.brand.count();
      const categoryCount = await tx.category.count();
      const userCount = await tx.user.count();
      return {
        productCount,
        deletedCount,
        brandCount,
        categoryCount,
        userCount,
      };
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        sku: true,
        createdAt: true,
        priceCents: true,
      },
    }),
    prisma.sizeVariant.findMany({
      where: {
        stock: { lt: LOW_STOCK_THRESHOLD },
        product: { deletedAt: null },
      },
      include: { product: { select: { id: true, name: true, sku: true } } },
      orderBy: { stock: "asc" },
      take: 10,
    }),
    prisma.product.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: 5,
      select: { id: true, name: true, sku: true, deletedAt: true },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your e-commerce platform and monitor key metrics
              </p>
            </div>
            <Link
              href="/admin/products/new"
              className="text-sm rounded bg-neutral-900 text-white px-4 py-2 hover:bg-neutral-800"
            >
              New Product
            </Link>
          </div>
        </div>

        {/* Metrics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Active Products"
            value={counts.productCount}
            subtitle="Currently available"
            href="/admin/products"
          />
          <MetricCard
            title="Deleted Products"
            value={counts.deletedCount}
            subtitle="Archived products"
            href="/admin/products?deleted=1"
          />
          <MetricCard
            title="Brands"
            value={counts.brandCount}
            subtitle="Product brands"
            href="/admin/brands"
          />
          <MetricCard
            title="Categories"
            value={counts.categoryCount}
            subtitle="Product categories"
            href="/admin/categories"
          />
          <MetricCard
            title="Total Users"
            value={counts.userCount}
            subtitle="Registered users"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Quick Actions
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Frequently used admin functions
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <ActionLink href="/admin/products" text="Manage Products" />
              <ActionLink
                href="/admin/product-teams"
                text="Product-Team Links"
              />
              <ActionLink href="/admin/brands" text="Manage Brands" />
              <ActionLink href="/admin/categories" text="Manage Categories" />
              <ActionLink href="/admin/cms" text="Content Management" />
              <ActionLink href="/admin/reviews" text="Review Moderation" />
              <ActionLink href="/admin/analytics" text="Search Analytics" />
              <ActionLink href="/admin/discount-codes" text="Discount Codes" />
              <ActionLink
                href="/admin/personalization"
                text="Personalization"
              />
              <ActionLink href="/admin/inventory" text="Inventory" />
              <ActionLink href="/admin/shipping" text="Shipping Dashboard" />
              <ActionLink href="/admin/notifications" text="Notifications" />
              <ActionLink href="/admin/social" text="Social Commerce" />
              <ActionLink href="/admin/users/analytics" text="User Analytics" />
              <ActionLink href="/admin/security" text="Security" />
              <ActionLink href="/admin/settings" text="System Settings" />
              <div className="col-span-2 md:col-span-2 lg:col-span-2">
                <TriggerDailyReportButton />
              </div>
            </div>
          </div>
        </div>
        {/* Recent Products Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Products
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Latest products added to your catalog
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="py-3 px-6 font-medium text-gray-900">Name</th>
                  <th className="py-3 px-6 font-medium text-gray-900">SKU</th>
                  <th className="py-3 px-6 font-medium text-gray-900">
                    Created
                  </th>
                  <th className="py-3 px-6 font-medium text-gray-900">Price</th>
                  <th className="py-3 px-6 font-medium text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentProducts.map(
                  (p: {
                    id: string;
                    name: string;
                    sku: string;
                    createdAt: Date;
                    priceCents: number;
                  }) => (
                    <tr
                      key={p.id}
                      className="border-t border-gray-200 hover:bg-gray-50"
                    >
                      <td className="py-4 px-6 font-medium text-gray-900">
                        {p.name}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-gray-600">
                        {p.sku}
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-500">
                        {p.createdAt.toISOString().split("T")[0]}
                      </td>
                      <td className="py-4 px-6 font-medium">
                        <ClientPrice cents={p.priceCents} size="sm" />
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                )}
                {recentProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-gray-500 text-sm"
                    >
                      No products yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Low Stock Alert (&lt; {LOW_STOCK_THRESHOLD})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Products running low on inventory
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="py-3 px-6 font-medium text-gray-900">
                    Product
                  </th>
                  <th className="py-3 px-6 font-medium text-gray-900">SKU</th>
                  <th className="py-3 px-6 font-medium text-gray-900">Size</th>
                  <th className="py-3 px-6 font-medium text-gray-900">Stock</th>
                  <th className="py-3 px-6 font-medium text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map(
                  (sv: {
                    id: string;
                    label: string;
                    stock: number;
                    product: { id: string; name: string; sku: string };
                  }) => (
                    <tr
                      key={sv.id}
                      className="border-t border-gray-200 hover:bg-gray-50"
                    >
                      <td className="py-4 px-6 font-medium text-gray-900">
                        {sv.product.name}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-gray-600">
                        {sv.product.sku}
                      </td>
                      <td className="py-4 px-6 text-gray-700">{sv.label}</td>
                      <td
                        className={`py-4 px-6 font-semibold ${
                          sv.stock === 0 ? "text-red-600" : "text-yellow-600"
                        }`}
                      >
                        {sv.stock}
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          href={`/admin/products/${sv.product.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                )}
                {lowStock.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-green-600 text-sm"
                    >
                      No low stock variants 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recently Deleted Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Recently Deleted
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Products that have been recently removed
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="py-3 px-6 font-medium text-gray-900">Name</th>
                  <th className="py-3 px-6 font-medium text-gray-900">SKU</th>
                  <th className="py-3 px-6 font-medium text-gray-900">
                    Deleted
                  </th>
                  <th className="py-3 px-6 font-medium text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentDeleted.map(
                  (d: {
                    id: string;
                    name: string;
                    sku: string;
                    deletedAt: Date | null;
                  }) => (
                    <tr
                      key={d.id}
                      className="border-t border-gray-200 hover:bg-gray-50 opacity-70"
                    >
                      <td className="py-4 px-6 font-medium text-gray-700">
                        {d.name}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-gray-600">
                        {d.sku}
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-500">
                        {d.deletedAt?.toISOString().split("T")[0]}
                      </td>
                      <td className="py-4 px-6 flex gap-3">
                        <Link
                          href={`/admin/products/${d.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          View
                        </Link>
                        <RestoreProductButton productId={d.id} />
                      </td>
                    </tr>
                  )
                )}
                {recentDeleted.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-gray-500 text-sm"
                    >
                      No deleted products
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
const MetricCard = ({
  title,
  value,
  subtitle,
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;
}) => {
  const content = (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
};

// Action Link Component
const ActionLink = ({ href, text }: { href: string; text: string }) => (
  <Link
    href={href}
    className="text-sm text-blue-600 hover:text-blue-800 hover:underline p-2 rounded hover:bg-blue-50 transition-colors"
  >
    {text}
  </Link>
);
