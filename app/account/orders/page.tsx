import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { AccountNavigation } from "@/components/account/AccountNavigation";
import { ClientPrice } from "@/components/ui/ClientPrice";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = session?.user?.id;
  if (!uid)
    return <div className="p-6">Please log in to view your orders.</div>;
  const orders = await prisma.order.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      totalCents: true,
      createdAt: true,
      currency: true,
    },
  });
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-8">
        Order History
      </h1>

      <div className="md:grid md:grid-cols-[230px_1fr] md:gap-10 lg:gap-16">
        {/* Left Navigation */}
        <AccountNavigation showBackToAccount={true} />

        {/* Main Content */}
        <div className="space-y-4">
          {orders.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                No orders yet
              </p>
              <Link
                href="/"
                className="bg-black text-white px-6 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Start Shopping
              </Link>
            </div>
          )}

          <ul className="space-y-4">
            {orders.map((o) => (
              <li
                key={o.id}
                className="border rounded-lg p-6 flex justify-between items-center bg-white dark:bg-neutral-800 dark:border-neutral-700"
              >
                <div>
                  <div className="font-medium text-neutral-900 dark:text-white">
                    Order #{o.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 mr-2">
                      {o.status}
                    </span>
                    {new Date(o.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-semibold text-neutral-900 dark:text-white">
                      <ClientPrice cents={o.totalCents} />
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      Total
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Link
                      href={`/account/orders/${o.id}`}
                      className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
