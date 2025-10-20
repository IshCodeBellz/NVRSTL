import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { z } from "zod";
import { ExtendedSession } from "@/lib/types";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(32)
    .transform((s) => s.toUpperCase()),
  kind: z.enum(["FIXED", "PERCENT"]),
  valueCents: z.number().int().nonnegative().optional(),
  percent: z.number().int().min(1).max(100).optional(),
  minSubtotalCents: z.number().int().nonnegative().optional(),
  usageLimit: z.number().int().min(1).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export async function GET() {
  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ codes });
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(
    authOptionsEnhanced
  )) as ExtendedSession | null;
  if (!session?.user?.isAdmin)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const data = parsed.data;
  if (data.kind === "FIXED" && !data.valueCents)
    return NextResponse.json({ error: "missing_valueCents" }, { status: 400 });
  if (data.kind === "PERCENT" && !data.percent)
    return NextResponse.json({ error: "missing_percent" }, { status: 400 });
  const created = await prisma.discountCode.create({
    data: {
      code: data.code,
      kind: data.kind,
      valueCents: data.valueCents,
      percent: data.percent,
      minSubtotalCents: data.minSubtotalCents,
      usageLimit: data.usageLimit,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
    },
  });
  return NextResponse.json({ code: created });
}
