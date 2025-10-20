import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { ExtendedSession } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = (await getServerSession(
    authOptionsEnhanced
  )) as ExtendedSession | null;
  const uid = session?.user?.id;
  if (!uid)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.isAdmin)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const existing = await prisma.product.findUnique({
    where: { id: params.id },
    select: { id: true, deletedAt: true },
  });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!existing.deletedAt) return NextResponse.json({ ok: true });
  await prisma.product.update({
    where: { id: params.id },
    data: { deletedAt: null },
  });
  return NextResponse.json({ ok: true });
}
