import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { withRequest } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

// GET /api/orders/:id/events - timeline events for user's order
export const GET = withRequest(async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = session?.user?.id;
  if (!uid)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const order = await prisma.order.findFirst({
    where: { id: params.id, userId: uid },
    select: { id: true },
  });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const events = await prisma.orderEvent.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      kind: true,
      message: true,
      createdAt: true,
      meta: true,
    },
  });
  return NextResponse.json({ events });
});
