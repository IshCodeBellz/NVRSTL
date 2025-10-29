import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import Link from "next/link";
import { SyncPaymentButton } from "@/components/admin/orders/SyncPaymentButton";

export const dynamic = "force-dynamic";

const ALLOWED = [
  "PENDING",
  "AWAITING_PAYMENT",
  "PAID",
  "FULFILLING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const session = await getServerSession(authOptionsEnhanced);
  const isAdmin = (session?.user as { isAdmin: boolean })?.isAdmin;
  if (!isAdmin) return <div className="p-6">Unauthorized</div>;

  const statusParam = searchParams?.status;
  // If status param is "all" or not provided, show all orders
  // Otherwise filter by the selected status
  const filterStatus =
    statusParam && statusParam !== "all" && ALLOWED.includes(statusParam)
      ? statusParam
      : undefined;

  const orders = await prisma.order.findMany({
    where: filterStatus ? { status: filterStatus } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      totalCents: true,
      createdAt: true,
      currency: true,
      email: true,
      paidAt: true,
    },
  });
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Orders Management
              </h1>
              <p className="text-gray-600 mt-1">
                View, manage, and update order statuses across your e-commerce
                platform
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/shipping"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                📦 Shipping Dashboard
              </Link>
              <Link
                href="/admin"
                className="text-sm rounded bg-neutral-200 text-neutral-900 px-3 py-2 hover:bg-neutral-300"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Filter Orders
          </h2>
          <div className="flex gap-2 flex-wrap text-sm">
            <Link
              href="/admin/orders"
              className={
                !statusParam || statusParam === "all"
                  ? "font-semibold underline px-3 py-1 bg-blue-100 text-blue-800 rounded"
                  : "px-3 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              }
            >
              All
            </Link>
            {ALLOWED.map((s) => (
              <Link
                key={s}
                href={`/admin/orders?status=${s}`}
                className={
                  filterStatus === s
                    ? "font-semibold underline px-3 py-1 bg-blue-100 text-blue-800 rounded"
                    : "px-3 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                }
              >
                {s}
              </Link>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="py-3 px-6 font-medium text-gray-900">Order</th>
                  <th className="py-3 px-6 font-medium text-gray-900">
                    Status
                  </th>
                  <th className="py-3 px-6 font-medium text-gray-900">Total</th>
                  <th className="py-3 px-6 font-medium text-gray-900">
                    Customer
                  </th>
                  <th className="py-3 px-6 font-medium text-gray-900">Paid</th>
                  <th className="py-3 px-6 font-medium text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <p className="font-medium">No orders found</p>
                        <p className="text-sm">
                          Orders will appear here once customers place them
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-t border-gray-200 hover:bg-gray-50"
                    >
                      <td className="py-4 px-6 font-mono text-xs text-gray-600">
                        #{o.id.slice(0, 8)}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            o.status === "DELIVERED"
                              ? "bg-green-100 text-green-800"
                              : o.status === "SHIPPED"
                              ? "bg-blue-100 text-blue-800"
                              : o.status === "PAID"
                              ? "bg-yellow-100 text-yellow-800"
                              : o.status === "CANCELLED"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium text-gray-900">
                        {(o.totalCents / 100).toFixed(2)} {o.currency}
                      </td>
                      <td className="py-4 px-6 text-gray-600">{o.email}</td>
                      <td className="py-4 px-6 text-gray-600">
                        {o.paidAt
                          ? new Date(o.paidAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2 items-center flex-wrap">
                          {/* Sync from Stripe button for AWAITING_PAYMENT orders */}
                          <SyncPaymentButton
                            orderId={o.id}
                            currentStatus={o.status}
                          />
                          {/* Quick start fulfillment when order is PAID */}
                          {o.status === "PAID" && (
                            <form
                              action={`/api/admin/orders/${o.id}/fulfill/start`}
                              method="post"
                            >
                              <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold">
                                Start Fulfillment
                              </button>
                            </form>
                          )}
                          <form
                            action={`/api/admin/orders/${o.id}/status`}
                            method="post"
                            className="flex gap-2 items-center"
                          >
                            <select
                              name="status"
                              defaultValue={o.status}
                              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              {ALLOWED.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors">
                              Save
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
