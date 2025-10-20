import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { withRequest } from "@/lib/server/logger";
import { z } from "zod";
import { ExtendedSession } from "@/lib/types";

export const dynamic = "force-dynamic";

const brandSchema = z.object({ name: z.string().min(2).max(80) });

async function ensureAdmin() {
  const session = (await getServerSession(
    authOptionsEnhanced
  )) as ExtendedSession | null;
  const uid = session?.user?.id;
  if (!uid) return null;
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.isAdmin) return null;
  return user;
}

export const GET = withRequest(async function GET() {
  const admin = await ensureAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ brands });
});

export const POST = withRequest(async function POST(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = brandSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const exists = await prisma.brand.findFirst({
    where: { name: parsed.data.name },
  });
  if (exists)
    return NextResponse.json({ error: "name_exists" }, { status: 409 });
  const created = await prisma.brand.create({
    data: { name: parsed.data.name },
  });
  return NextResponse.json({ brand: created }, { status: 201 });
});

export const PUT = withRequest(async function PUT(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const schema = z.object({
    id: z.string().length(25),
    name: z.string().min(2).max(80),
    logoUrl: z.string().url().optional().nullable(),
    backgroundImage: z.string().url().optional().nullable(),
    description: z.string().max(500).optional().nullable(),
    isFeatured: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const {
    id,
    name,
    logoUrl,
    backgroundImage,
    description,
    isFeatured,
    displayOrder,
  } = parsed.data;

  const updateData: Record<string, unknown> = { name };
  if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
  if (backgroundImage !== undefined)
    updateData.backgroundImage = backgroundImage;
  if (description !== undefined) updateData.description = description;
  if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
  if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

  const updated = await prisma.brand
    .update({ where: { id }, data: updateData })
    .catch(() => null);
  if (!updated)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ brand: updated });
});

export const DELETE = withRequest(async function DELETE(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  // Prevent delete if linked products exist
  const count = await prisma.product.count({ where: { brandId: id } });
  if (count > 0) return NextResponse.json({ error: "in_use" }, { status: 409 });
  const deleted = await prisma.brand
    .delete({ where: { id } })
    .catch(() => null);
  if (!deleted)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
});
