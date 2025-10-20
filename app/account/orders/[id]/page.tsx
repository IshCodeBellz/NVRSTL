import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import Link from "next/link";
import { AccountNavigation } from "@/components/account/AccountNavigation";
import { ClientPrice } from "@/components/ui/ClientPrice";
import { LocalTime } from "@/components/ui/LocalTime";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = session?.user?.id as string | undefined;
  if (!uid) return <div className="p-6">Please log in.</div>;
  const order = await prisma.order.findFirst({
    where: { id: params.id, userId: uid },
    include: {
      items: true,
      shippingAddress: true,
      billingAddress: true,
      payments: true,
    },
  });
  const events: Array<{
    id: string;
    kind: string;
    message: string | null;
    createdAt: Date;
    meta: string | null;
  }> = order
    ? await prisma.orderEvent.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: "asc" },
      })
    : [];
  if (!order)
    return <div className="max-w-6xl mx-auto px-4 py-10">Order not found.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="md:grid md:grid-cols-[230px_1fr] md:gap-10 lg:gap-16">
        {/* Left Navigation to align layout with account section */}
        <AccountNavigation showBackToAccount={true} />
        <div className="md:col-start-2">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <Link
              href="/account/orders"
              className="text-sm text-blue-600 hover:underline"
            >
              Back to orders
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <h2 className="font-medium">Items</h2>
              <ul className="divide-y border rounded">
                {order.items.map((i) => (
                  <li key={i.id} className="p-3 flex justify-between text-sm">
                    <div>
                      <div className="font-medium">
                        {i.nameSnapshot}
                        {i.size ? ` / ${i.size}` : ""}
                      </div>
                      <div className="text-neutral-500 flex items-center gap-1">
                        <span>Qty {i.qty} • Unit</span>
                        <ClientPrice cents={i.unitPriceCents} />
                      </div>
                    </div>
                    <div className="font-medium">
                      <ClientPrice cents={i.lineTotalCents} />
                    </div>
                  </li>
                ))}
              </ul>
              <div>
                <h2 className="font-medium mt-6">Timeline</h2>
                <ul className="mt-2 border rounded divide-y text-xs">
                  {events.map((e) => (
                    <li key={e.id} className="p-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="font-mono text-[10px] opacity-60">
                          <LocalTime value={e.createdAt} variant="time" />
                        </span>
                        <span className="font-semibold">{e.kind}</span>
                      </div>
                      {e.message && <div>{e.message}</div>}
                    </li>
                  ))}
                  {events.length === 0 && (
                    <li className="p-2 text-neutral-500">No events yet.</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="font-medium">Summary</h2>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <ClientPrice cents={order.subtotalCents} />
                </div>
                {order.discountCents > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>
                      -<ClientPrice cents={order.discountCents} />
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax</span>
                  <ClientPrice cents={order.taxCents} />
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <ClientPrice cents={order.shippingCents} />
                </div>
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total</span>
                  <span>
                    <ClientPrice cents={order.totalCents} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span>{order.status}</span>
                </div>
              </div>
              <div>
                <h3 className="font-medium mt-4">Shipping Address</h3>
                <div className="text-xs whitespace-pre-line">
                  {order.shippingAddress?.fullName}\n
                  {order.shippingAddress?.line1}
                  {order.shippingAddress?.line2
                    ? `\n${order.shippingAddress.line2}`
                    : ""}
                  \n{order.shippingAddress?.city}{" "}
                  {order.shippingAddress?.postalCode}\n
                  {order.shippingAddress?.country}
                </div>
                <h3 className="font-medium mt-4">Billing Address</h3>
                <div className="text-xs whitespace-pre-line">
                  {order.billingAddress?.fullName}\n
                  {order.billingAddress?.line1}
                  {order.billingAddress?.line2
                    ? `\n${order.billingAddress.line2}`
                    : ""}
                  \n{order.billingAddress?.city}{" "}
                  {order.billingAddress?.postalCode}
                  \n{order.billingAddress?.country}
                </div>
              </div>
              <div>
                <h3 className="font-medium mt-4">Payments</h3>
                <ul className="text-xs space-y-1">
                  {order.payments.map((p) => (
                    <li key={p.id}>
                      [{p.status}] {p.provider}{" "}
                      <ClientPrice cents={p.amountCents} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
