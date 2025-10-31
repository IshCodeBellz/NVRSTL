import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import OrderPaymentClient from "./OrderPaymentClient";

export const dynamic = "force-dynamic";

export default async function OrderPaymentPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = session?.user?.id;
  if (!uid) {
    redirect(`/login?callbackUrl=/account/orders/${params.id}/pay`);
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, userId: uid },
    select: {
      id: true,
      status: true,
      totalCents: true,
      currency: true,
    },
  });

  if (!order) {
    return <div className="p-6">Order not found.</div>;
  }

  if (!["AWAITING_PAYMENT", "PENDING"].includes(order.status)) {
    redirect(`/account/orders/${order.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Complete payment
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Securely finish paying for order #{order.id.slice(0, 8).toUpperCase()}.
        </p>
      </div>
      <OrderPaymentClient
        orderId={order.id}
        totalCents={order.totalCents}
        currency={order.currency || "GBP"}
      />
    </div>
  );
}


