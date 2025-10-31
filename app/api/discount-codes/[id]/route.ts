import { getServerSession } from "next-auth";
import { logger } from "@/lib/server/logger";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptionsEnhanced);
  if (!session?.user?.isAdmin)
    return new NextResponse("Unauthorized", { status: 401 });
  const data = await req.json();
  // Allow partial update of mutable fields
  const updatable: Record<string, unknown> = {};
  for (const key of [
    "valueCents",
    "percent",
    "usageLimit",
    "minSubtotalCents",
    "startsAt",
    "endsAt",
  ]) {
    if (!(key in data)) continue;
    const v = (data as any)[key];
    if (key === "startsAt" || key === "endsAt") {
      updatable[key] = v ? new Date(v as string) : null;
    } else if (
      key === "valueCents" ||
      key === "percent" ||
      key === "usageLimit" ||
      key === "minSubtotalCents"
    ) {
      updatable[key] =
        v === undefined || v === null || v === "" ? null : Number(v);
    } else {
      updatable[key] = v;
    }
  }
  try {
    const updated = await prisma.discountCode.update({
      where: { id: params.id },
      data: updatable,
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error:", error);
    return new NextResponse("Not Found", { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptionsEnhanced);
  if (!session?.user?.isAdmin)
    return new NextResponse("Unauthorized", { status: 401 });
  try {
    await prisma.discountCode.delete({ where: { id: params.id } });
    return new NextResponse("", { status: 204 });
  } catch (error) {
    logger.error("Error:", error);
    return new NextResponse("Not Found", { status: 404 });
  }
}
