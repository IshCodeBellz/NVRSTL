import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { withRequest } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

// GET /api/orders - list current user's orders (most recent first)
export const GET = withRequest(async function GET() {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = session?.user?.id;
  if (!uid) return NextResponse.json({ orders: [] });
  const orders = await prisma.order.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      totalCents: true,
      subtotalCents: true,
      createdAt: true,
      currency: true,
      paidAt: true,
      cancelledAt: true,
    },
  });
  return NextResponse.json({ orders });
});
