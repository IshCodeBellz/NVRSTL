import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import { InventoryService } from "@/lib/server/inventoryService";
import Link from "next/link";

export const revalidate = 30; // More frequent updates for inventory

export default async function InventoryPage() {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = (session?.user as { id: string })?.id;
  if (!uid) redirect("/login?callbackUrl=/admin/inventory");

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.isAdmin) redirect("/");

  const inventoryService = new InventoryService();

  // Get inventory data
  const [stockAlerts, recentMovements, lowStockItems, inventoryStats] =
    await Promise.all([
      inventoryService.getStockAlerts(),
      inventoryService.getRecentStockMovements(20),
      inventoryService.getLowStockProducts(10),
      inventoryService.getInventoryStats(),
    ]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Inventory Management
          </h1>
          <p className="text-neutral-600 mt-2">
            Monitor stock levels, alerts, and movements
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/inventory/bulk-update"
            className="text-sm rounded bg-blue-600 text-white px-3 py-2 hover:bg-blue-700"
          >
            Bulk Update
          </Link>
          <Link
            href="/admin"
            className="text-sm rounded bg-neutral-200 text-neutral-900 px-3 py-2 hover:bg-neutral-300"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Inventory Stats */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products"
          value={inventoryStats.totalProducts.toLocaleString()}
          subtitle="Active SKUs"
          color="blue"
        />
        <StatCard
          title="Low Stock Alerts"
          value={inventoryStats.lowStockCount.toString()}
          subtitle="Requires attention"
          color="orange"
        />
        <StatCard
          title="Out of Stock"
          value={inventoryStats.outOfStockCount.toString()}
          subtitle="Immediate action needed"
          color="red"
        />
        <StatCard
          title="Total Value"
          value={`$${inventoryStats.totalValue.toLocaleString()}`}
          subtitle="Current inventory"
          color="green"
        />
      </section>

      {/* Stock Alerts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Stock Alerts</h2>
          <button className="text-sm text-blue-600 hover:underline">
            Configure Alert Thresholds
          </button>
        </div>
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Product</th>
                <th className="text-left py-3 px-4 font-medium">Variant</th>
                <th className="text-left py-3 px-4 font-medium">
                  Current Stock
                </th>
                <th className="text-left py-3 px-4 font-medium">Alert Level</th>
                <th className="text-left py-3 px-4 font-medium">Days Left</th>
                <th className="text-left py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stockAlerts.map((alert, index) => (
                <tr key={index} className="border-t hover:bg-neutral-50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{alert.productName}</div>
                      <div className="text-sm text-neutral-500">
                        {alert.sku}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">{alert.variant}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-medium ${
                        alert.currentStock === 0
                          ? "text-red-600"
                          : alert.currentStock <= 5
                          ? "text-orange-600"
                          : "text-neutral-900"
                      }`}
                    >
                      {alert.currentStock}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        alert.alertLevel === "critical"
                          ? "bg-red-100 text-red-800"
                          : alert.alertLevel === "warning"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {alert.alertLevel}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm">{alert.daysLeft || "N/A"}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="text-sm text-blue-600 hover:underline">
                        Reorder
                      </button>
                      <button className="text-sm text-neutral-600 hover:underline">
                        Update
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Stock Movements */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Stock Movements</h2>
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">Product</th>
                <th className="text-left py-3 px-4 font-medium">Type</th>
                <th className="text-left py-3 px-4 font-medium">Quantity</th>
                <th className="text-left py-3 px-4 font-medium">Reference</th>
                <th className="text-left py-3 px-4 font-medium">New Stock</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.map((movement, index) => (
                <tr key={index} className="border-t hover:bg-neutral-50">
                  <td className="py-3 px-4 text-sm">
                    {new Date(movement.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-sm">
                        {movement.productName}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {movement.variant}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {(() => {
                      const color =
                        movement.type === "incoming"
                          ? "bg-green-100 text-green-800"
                          : movement.type === "outgoing"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"; // adjustment
                      return (
                        <span className={`px-2 py-1 text-xs rounded ${color}`}>
                          {movement.type}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        movement.type === "outgoing"
                          ? "text-red-600"
                          : movement.type === "incoming"
                          ? "text-green-600"
                          : "text-blue-600"
                      }
                    >
                      {movement.type === "outgoing"
                        ? `-${movement.quantity}`
                        : movement.type === "incoming"
                        ? `+${movement.quantity}`
                        : movement.quantity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-neutral-600">
                    {movement.reference}
                  </td>
                  <td className="py-3 px-4 font-medium">{movement.newStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Low Stock Items */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Low Stock Items</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lowStockItems.map((item, index) => (
            <div key={index} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{item.productName}</h3>
                  <p className="text-xs text-neutral-500">{item.sku}</p>
                  <p className="text-xs text-neutral-600 mt-1">
                    {item.variant}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    item.stock === 0
                      ? "bg-red-100 text-red-800"
                      : "bg-orange-100 text-orange-800"
                  }`}
                >
                  {item.stock} left
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">
                  Threshold: {item.threshold}
                </span>
                <button className="text-xs text-blue-600 hover:underline">
                  Quick Reorder
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bulk Actions */}
      <section className="bg-neutral-50 rounded-lg p-6">
        <h3 className="font-medium mb-4">Bulk Operations</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <button className="bg-white border rounded-lg p-4 text-left hover:bg-neutral-50">
            <h4 className="font-medium text-sm">Import Stock Levels</h4>
            <p className="text-xs text-neutral-600 mt-1">
              Upload CSV to update inventory
            </p>
          </button>
          <button className="bg-white border rounded-lg p-4 text-left hover:bg-neutral-50">
            <h4 className="font-medium text-sm">Generate Reorder Report</h4>
            <p className="text-xs text-neutral-600 mt-1">
              Download suggested reorders
            </p>
          </button>
          <button className="bg-white border rounded-lg p-4 text-left hover:bg-neutral-50">
            <h4 className="font-medium text-sm">Inventory Audit</h4>
            <p className="text-xs text-neutral-600 mt-1">
              Export full inventory report
            </p>
          </button>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: "blue" | "orange" | "red" | "green";
}) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200",
    orange: "bg-orange-50 border-orange-200",
    red: "bg-red-50 border-red-200",
    green: "bg-green-50 border-green-200",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium text-neutral-600">{title}</h3>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
    </div>
  );
}
