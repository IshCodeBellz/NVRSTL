import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code)
    return NextResponse.json(
      { valid: false, reason: "missing_code" },
      { status: 400 }
    );
  const now = new Date();
  const dc = await prisma.discountCode.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!dc) return NextResponse.json({ valid: false, reason: "not_found" });
  if (dc.startsAt && dc.startsAt > now)
    return NextResponse.json({ valid: false, reason: "not_started" });
  if (dc.endsAt && dc.endsAt < now)
    return NextResponse.json({ valid: false, reason: "expired" });
  return NextResponse.json({
    valid: true,
    kind: dc.kind,
    valueCents: dc.valueCents,
    percent: dc.percent,
    minSubtotalCents: dc.minSubtotalCents,
    usageLimit: dc.usageLimit,
    timesUsed: dc.timesUsed,
  });
}
