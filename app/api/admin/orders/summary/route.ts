import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptionsEnhanced);
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Group counts by status
  const grouped = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  for (const g of grouped) {
    counts[g.status] = g._count._all;
  }

  return NextResponse.json(
    {
      counts,
      totalPaid: counts["PAID"] || 0,
      updatedAt: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
