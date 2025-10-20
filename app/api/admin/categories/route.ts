import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { withRequest, warn } from "@/lib/server/logger";
import { z } from "zod";
import { ExtendedSession } from "@/lib/types";

export const dynamic = "force-dynamic";

const categorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/)
    .min(2)
    .max(80),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  parentId: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

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
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });
  return NextResponse.json({ categories });
});

export const POST = withRequest(async function POST(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    warn("Category validation failed", { issues: parsed.error.issues });
    return NextResponse.json(
      {
        error: "invalid_payload",
        details: parsed.error.issues,
      },
      { status: 400 }
    );
  }
  const {
    slug,
    name,
    description,
    imageUrl,
    parentId,
    displayOrder,
    isActive,
  } = parsed.data;
  // Enforce slug uniqueness globally (DB has unique constraint)
  const slugExists = await prisma.category.findUnique({ where: { slug } });
  if (slugExists)
    return NextResponse.json({ error: "exists" }, { status: 409 });

  // Allow duplicate names across different parents; enforce uniqueness within the same parent scope
  const nameExists = await prisma.category.findFirst({
    where: { name, parentId: parentId ?? null },
  });
  if (nameExists)
    return NextResponse.json({ error: "exists" }, { status: 409 });

  // If parentId is provided, verify it exists
  if (parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parentId },
    });
    if (!parent)
      return NextResponse.json({ error: "parent_not_found" }, { status: 400 });
  }

  const created = await prisma.category.create({
    data: {
      slug,
      name,
      description: description || null,
      imageUrl: imageUrl || null,
      parentId: parentId || null,
      displayOrder: displayOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    },
    include: {
      parent: true,
      children: true,
      _count: {
        select: { products: true },
      },
    },
  });
  return NextResponse.json(
    { category: { ...created, productCount: created._count.products } },
    { status: 201 }
  );
});

export const PUT = withRequest(async function PUT(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const schema = z.object({
    id: z.string().length(25),
    name: z.string().min(2).max(80),
    description: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
    parentId: z.string().optional().nullable(),
    displayOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const { id, name, description, imageUrl, parentId, displayOrder, isActive } =
    parsed.data;

  // If parentId is provided, verify it exists and prevent circular references
  if (parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parentId },
    });
    if (!parent)
      return NextResponse.json({ error: "parent_not_found" }, { status: 400 });
    if (parentId === id)
      return NextResponse.json(
        { error: "circular_reference" },
        { status: 400 }
      );
  }

  const updateData: Record<string, unknown> = { name };
  if (description !== undefined) updateData.description = description || null;
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
  if (parentId !== undefined) updateData.parentId = parentId || null;
  if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
  if (isActive !== undefined) updateData.isActive = isActive;

  const updated = await prisma.category
    .update({
      where: { id },
      data: updateData,
    })
    .catch(() => null);
  if (!updated)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ category: updated });
});

export const DELETE = withRequest(async function DELETE(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) return NextResponse.json({ error: "in_use" }, { status: 409 });
  const deleted = await prisma.category
    .delete({ where: { id } })
    .catch(() => null);
  if (!deleted)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
});
