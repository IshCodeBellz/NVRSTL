import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import DiscountCodesClient from "./table.client";

export const dynamic = "force-dynamic";

export default async function DiscountCodesAdminPage() {
  const session = await getServerSession(authOptionsEnhanced);
  if (!(session?.user as { isAdmin: boolean })?.isAdmin)
    return <div className="p-6">Unauthorized</div>;
  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const clientCodes = codes.map((c) => ({
    id: c.id,
    code: c.code,
    kind: c.kind as "FIXED" | "PERCENT",
    valueCents: c.valueCents,
    percent: c.percent,
    minSubtotalCents: c.minSubtotalCents,
    usageLimit: c.usageLimit,
    timesUsed: c.timesUsed,
    startsAt: c.startsAt ? c.startsAt.toISOString() : null,
    endsAt: c.endsAt ? c.endsAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  }));
  return <DiscountCodesClient initial={clientCodes} />;
}
