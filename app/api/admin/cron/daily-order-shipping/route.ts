import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { sendDailyOrderShippingReport } from "@/lib/server/reports/orderShippingReport";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = (session?.user as { id?: string })?.id;
  if (!uid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: uid }, select: { isAdmin: true } });
  if (!user?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { date?: string };
  const date = body.date ? new Date(body.date) : new Date();

  try {
    const { count } = await sendDailyOrderShippingReport(date);
    return NextResponse.json({ ok: true, count, date: date.toISOString().split("T")[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}


