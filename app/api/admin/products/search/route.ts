import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = session?.user?.id;
  if (!uid)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.isAdmin)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const brand = searchParams.get("brand") || undefined;
  const category = searchParams.get("category") || undefined;
  const includeDeleted = searchParams.get("deleted") === "1";
  if (!q && !brand && !category) return NextResponse.json({ items: [] });
  // Build base filters excluding case-insensitive logic first
  const baseFilters = {
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(brand ? { brandId: brand } : {}),
    ...(category ? { categoryId: category } : {}),
  } as const;

  let items;
  if (!q) {
    items = await prisma.product.findMany({
      where: baseFilters,
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        name: true,
        sku: true,
        priceCents: true,
        deletedAt: true,
      },
    });
  } else {
    // Do a broader fetch limited by time/order first then filter in memory for case-insensitive match.
    // This avoids unsupported 'mode' usage in Prisma with SQLite.
    const preliminary = await prisma.product.findMany({
      where: baseFilters,
      orderBy: { createdAt: "desc" },
      take: 120, // wider net before filtering
      select: {
        id: true,
        name: true,
        sku: true,
        priceCents: true,
        deletedAt: true,
      },
    });
    const qLower = q.toLowerCase();
    items = preliminary
      .filter(
        (p: { name: string; sku: string }) =>
          p.name.toLowerCase().includes(qLower) ||
          p.sku.toLowerCase().includes(qLower)
      )
      .slice(0, 30);
  }
  return NextResponse.json({ items });
}
