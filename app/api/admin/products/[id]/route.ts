/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const productUpdateSchema = z.object({
  sku: z.string().min(3),
  name: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().positive(),
  brandId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  productType: z.string().optional().nullable(),
  isJersey: z.boolean().optional(),
  jerseyConfig: z.string().optional().nullable(),
  images: z
    .array(
      z.object({
        id: z.string().optional(),
        url: z.string().url(),
        alt: z.string().optional(),
        position: z.number().int().nonnegative().optional(),
      })
    )
    .min(1),
  sizes: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().min(1),
        stock: z.number().int().min(0),
      })
    )
    .optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = session?.user?.id;
  if (!uid) return { error: "unauthorized" as const };
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.isAdmin) return { error: "forbidden" as const };
  return { user };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if ("error" in admin)
    return NextResponse.json(
      { error: admin.error },
      { status: admin.error === "unauthorized" ? 401 : 403 }
    );
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      images: { orderBy: { position: "asc" } },
      sizeVariants: true,
      brand: true,
      category: true,
    },
  });
  if (!product)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if ("error" in admin)
    return NextResponse.json(
      { error: admin.error },
      { status: admin.error === "unauthorized" ? 401 : 403 }
    );
  const existing = await prisma.product.findUnique({
    where: { id: params.id },
    select: { id: true, deletedAt: true },
  });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.deletedAt) return NextResponse.json({ ok: true });
  await prisma.product.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if ("error" in admin)
    return NextResponse.json(
      { error: admin.error },
      { status: admin.error === "unauthorized" ? 401 : 403 }
    );
  const body = await req.json().catch(() => null);
  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const { images, sizes, ...rest } = parsed.data;
  // Server-side duplicate size label protection
  if (sizes) {
    const labels = sizes.map((s) => s.label.trim().toLowerCase());
    const dedup = new Set(labels);
    if (dedup.size !== labels.length) {
      return NextResponse.json({ error: "duplicate_sizes" }, { status: 400 });
    }
  }
  const existing = await prisma.product.findUnique({
    where: { id: params.id },
    select: { id: true, sku: true },
  });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (rest.sku !== existing.sku) {
    const skuExists = await prisma.product.findUnique({
      where: { sku: rest.sku },
      select: { id: true },
    });
    if (skuExists)
      return NextResponse.json({ error: "sku_exists" }, { status: 409 });
  }
  // Full replace strategy for images & sizes for simplicity
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.productImage.deleteMany({ where: { productId: existing.id } });
    await tx.sizeVariant.deleteMany({ where: { productId: existing.id } });
    const baseData: any = {
      sku: rest.sku,
      name: rest.name,
      description: rest.description,
      priceCents: rest.priceCents,
      brandId: rest.brandId ?? undefined,
      categoryId: rest.categoryId ?? undefined,
      gender: rest.gender ?? undefined,
      productType: rest.productType ?? undefined,
      images: {
        create: images.map((im, idx) => ({
          url: im.url,
          alt: im.alt,
          position: im.position ?? idx,
        })),
      },
      sizeVariants:
        sizes && sizes.length > 0
          ? {
              create: sizes.map((s) => ({
                label: s.label.trim(),
                stock: s.stock,
              })),
            }
          : undefined,
    };
    // try update with jersey fields if provided
    const withJersey = {
      ...baseData,
      ...(typeof rest.isJersey === "boolean"
        ? { isJersey: rest.isJersey }
        : {}),
      ...(typeof rest.jerseyConfig === "string"
        ? { jerseyConfig: rest.jerseyConfig }
        : {}),
    };
    try {
      await tx.product.update({ where: { id: existing.id }, data: withJersey });
    } catch (err) {
      const msg = (err as Error)?.message || "";
      const unknownArg =
        /Unknown (arg|argument|field)/i.test(msg) &&
        (msg.includes("isJersey") || msg.includes("jerseyConfig"));
      const missingColumn =
        /column\s+\"?isJersey\"?\s+does not exist/i.test(msg) ||
        /column\s+\"?jerseyConfig\"?\s+does not exist/i.test(msg) ||
        /column\s+`?isJersey`?\s+does not exist/i.test(msg) ||
        /column\s+`?jerseyConfig`?\s+does not exist/i.test(msg) ||
        /The\s+column\s+`?isJersey`?\s+does\s+not\s+exist\s+in\s+the\s+current\s+database/i.test(
          msg
        ) ||
        /The\s+column\s+`?jerseyConfig`?\s+does\s+not\s+exist\s+in\s+the\s+current\s+database/i.test(
          msg
        ) ||
        /no\s+such\s+column\s*:\s*isJersey/i.test(msg) ||
        /no\s+such\s+column\s*:\s*jerseyConfig/i.test(msg);
      const expectsJson =
        /Expected\s+Json|type\s+Json|Invalid\s+value\s+for\s+JSON/i.test(msg) &&
        msg.includes("jerseyConfig");
      if (
        expectsJson &&
        typeof rest.jerseyConfig === "string" &&
        rest.jerseyConfig
      ) {
        try {
          const parsedCfg = JSON.parse(rest.jerseyConfig);
          const withParsed = {
            ...baseData,
            ...(typeof rest.isJersey === "boolean"
              ? { isJersey: rest.isJersey }
              : {}),
            jerseyConfig: parsedCfg as unknown as object,
          };
          await tx.product.update({
            where: { id: existing.id },
            data: withParsed,
          });
          return;
        } catch {
          // fall through
        }
      }
      if (unknownArg || missingColumn) {
        // Retry without jersey fields
        await tx.product.update({ where: { id: existing.id }, data: baseData });
      } else {
        throw err;
      }
    }
  });
  try {
    const updated = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        images: { orderBy: { position: "asc" } },
        sizeVariants: true,
        brand: true,
        category: true,
      },
    });
    return NextResponse.json({ product: updated });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "server_error",
        message: e?.message || String(e),
        code: e?.code,
      },
      { status: 500 }
    );
  }
}
