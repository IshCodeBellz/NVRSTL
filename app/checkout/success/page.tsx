import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

import { ClientPrice } from "@/components/ui/ClientPrice";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { orderId?: string };
}) {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = session?.user?.id;
  const orderId = searchParams.orderId;
  if (!orderId || !uid) return notFound();
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: uid },
    include: { items: true },
  });
  if (!order) return notFound();
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-2">Thank you!</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Your order <span className="font-mono">{order.id}</span> has been
        received.
      </p>
      <div className="border rounded p-4 mb-8 bg-white">
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3">
          Summary
        </h2>
        <ul className="divide-y text-sm">
          {order.items.map((it) => (
            <li key={it.id} className="py-2 flex justify-between gap-4">
              <span className="flex-1 line-clamp-1">{it.nameSnapshot}</span>
              <span className="tabular-nums">
                {it.qty} × <ClientPrice cents={it.unitPriceCents} size="sm" />
              </span>
              <span className="tabular-nums font-medium">
                <ClientPrice cents={it.lineTotalCents} size="sm" />
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-4 border-t space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>
              <ClientPrice cents={order.subtotalCents} size="sm" />
            </span>
          </div>
          {order.discountCents > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount</span>
              <span>
                -<ClientPrice cents={order.discountCents} size="sm" />
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax</span>
            <span>
              <ClientPrice cents={order.taxCents} size="sm" />
            </span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>
              <ClientPrice cents={order.shippingCents} size="sm" />
            </span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Total</span>
            <span>
              <ClientPrice cents={order.totalCents} size="base" />
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-3 text-sm">
        <Link
          href="/account/orders"
          className="px-4 py-2 rounded border bg-white hover:bg-neutral-50"
        >
          View orders
        </Link>
        <Link
          href="/"
          className="px-4 py-2 rounded bg-neutral-900 text-white hover:bg-neutral-800"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
