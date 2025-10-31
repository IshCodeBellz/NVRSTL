import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import DiscountCodesClient from "./table.client";
import Link from "next/link";

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
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Discount Codes</h1>
            <p className="text-sm text-gray-600">Create and manage promotional codes</p>
          </div>
          <Link
            href="/admin"
            className="text-sm rounded bg-neutral-900 text-white px-4 py-2 hover:bg-neutral-800"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <DiscountCodesClient initial={clientCodes} />
        </div>
      </div>
    </div>
  );
}
