import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

// POST /api/admin/orders/:id/note { message }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let session = await getServerSession(authOptionsEnhanced);
  const testUser =
    process.env.NODE_ENV === "test" ? req.headers.get("x-test-user") : null;
  if (testUser) {
    session = {
      user: {
        id: testUser,
        email: "test@example.com",
        isAdmin: true,
        emailVerified: true,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      kind: "NOTE",
      message: body.message.trim().slice(0, 500),
      meta: JSON.stringify({ authorId: session?.user?.id }),
    },
  });
  return NextResponse.json({ ok: true });
}
