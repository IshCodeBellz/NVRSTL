/* eslint-disable */
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { withRequest } from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ExtendedSession } from "@/lib/types";

export const dynamic = "force-dynamic";

const productSchema = z.object({
  sku: z.string().min(3),
  name: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().positive(),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  gender: z.string().optional().nullable(),
  productType: z.string().optional().nullable(),
  isJersey: z.boolean().optional(),
  // Accept jerseyConfig as either a JSON object or a string (for legacy clients)
  jerseyConfig: z
    .union([z.string(), z.record(z.any())])
    .optional()
    .nullable(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().optional(),
        position: z.number().int().nonnegative().optional(),
      })
    )
    .min(1),
  sizes: z
    .array(
      z.object({ label: z.string().min(1), stock: z.number().int().min(0) })
    )
    .optional(),
});

export const POST = withRequest(async function POST(req: NextRequest) {
  const session = (await getServerSession(
    authOptionsEnhanced
  )) as ExtendedSession | null;
  const uid = session?.user?.id;
  if (!uid)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.isAdmin)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const { images, sizes, ...rest } = parsed.data;
  try {
    // Optional: verify referenced brand/category exist to avoid 500s from Prisma
    if (rest.brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: rest.brandId },
      });
      if (!brand)
        return NextResponse.json({ error: "invalid_brand" }, { status: 400 });
    }
    if (rest.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: rest.categoryId },
      });
      if (!category)
        return NextResponse.json(
          { error: "invalid_category" },
          { status: 400 }
        );
    }
    // Prevent duplicate size labels (unique constraint on [productId, label])
    if (sizes && sizes.length > 0) {
      const labels = sizes.map((s) => s.label.trim().toLowerCase());
      const dedup = new Set(labels);
      if (dedup.size !== labels.length) {
        return NextResponse.json({ error: "duplicate_sizes" }, { status: 400 });
      }
    }
    // Prevent duplicate SKU
    const existing = await prisma.product.findUnique({
      where: { sku: rest.sku },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "sku_exists" }, { status: 409 });
    }
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
  // Attempt create including jersey fields; if Prisma client isn't migrated yet,
  // retry without those fields to avoid blocking product creation.
  async function createWithFallback() {
    try {
      const cfgRaw = rest.jerseyConfig as unknown;
      const cfgStr =
        typeof cfgRaw === "string" && cfgRaw ? (cfgRaw as string) : undefined;
      const cfgObj =
        cfgRaw && typeof cfgRaw === "object" ? (cfgRaw as any) : undefined;
      let cfgParsed: any | undefined = undefined;
      if (cfgStr) {
        try {
          cfgParsed = JSON.parse(cfgStr);
        } catch {}
      }
      return await prisma.product.create({
        data: {
          sku: rest.sku,
          name: rest.name,
          description: rest.description,
          priceCents: rest.priceCents,
          gender: rest.gender ?? undefined,
          productType: rest.productType ?? undefined,
          // these may be rejected if client not migrated
          ...(typeof rest.isJersey === "boolean"
            ? { isJersey: rest.isJersey }
            : {}),
          ...(cfgObj
            ? { jerseyConfig: cfgObj as any }
            : cfgStr
            ? { jerseyConfig: (cfgParsed ?? cfgStr) as any }
            : {}),
          brand: rest.brandId ? { connect: { id: rest.brandId } } : undefined,
          category: rest.categoryId
            ? { connect: { id: rest.categoryId } }
            : undefined,
          images: {
            create: images.map((i, idx) => ({
              ...i,
              position: i.position ?? idx,
            })),
          },
          sizeVariants: sizes ? { create: sizes } : undefined,
        },
        include: { images: true, sizeVariants: true },
      });
    } catch (err) {
      const msg = (err as Error)?.message || "";
      // If Prisma client doesn't know these fields yet (missing migration/client), it throws Unknown arg/field errors
      // Or the database might not have the columns yet (column ... does not exist)
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
      const expectsString =
        /Expected\s+String|type\s+String|Invalid\s+value\s+for\s+string/i.test(
          msg
        ) && msg.includes("jerseyConfig");
      // If prisma expects JSON for jerseyConfig, retry with parsed object
      if (
        expectsJson &&
        typeof rest.jerseyConfig === "string" &&
        rest.jerseyConfig
      ) {
        try {
          const parsed = JSON.parse(rest.jerseyConfig);
          return await prisma.product.create({
            data: {
              sku: rest.sku,
              name: rest.name,
              description: rest.description,
              priceCents: rest.priceCents,
              gender: rest.gender ?? undefined,
              ...(typeof rest.isJersey === "boolean"
                ? { isJersey: rest.isJersey }
                : {}),
              jerseyConfig: parsed as unknown as object,
              brand: rest.brandId
                ? { connect: { id: rest.brandId } }
                : undefined,
              category: rest.categoryId
                ? { connect: { id: rest.categoryId } }
                : undefined,
              images: {
                create: images.map((i, idx) => ({
                  ...i,
                  position: i.position ?? idx,
                })),
              },
              sizeVariants: sizes ? { create: sizes } : undefined,
            },
            include: { images: true, sizeVariants: true },
          });
        } catch (e2) {
          // fall through to unknownArg/missingColumn handling below
        }
      }
      // If prisma expects a String (older schema), retry with string value
      if (
        expectsString &&
        ((typeof rest.jerseyConfig === "string" && rest.jerseyConfig) ||
          (rest.jerseyConfig && typeof rest.jerseyConfig === "object"))
      ) {
        const cfgVal =
          typeof rest.jerseyConfig === "string"
            ? rest.jerseyConfig
            : JSON.stringify(rest.jerseyConfig);
        return await prisma.product.create({
          data: {
            sku: rest.sku,
            name: rest.name,
            description: rest.description,
            priceCents: rest.priceCents,
            gender: rest.gender ?? undefined,
            ...(typeof rest.isJersey === "boolean"
              ? { isJersey: rest.isJersey }
              : {}),
            jerseyConfig: cfgVal,
            brand: rest.brandId ? { connect: { id: rest.brandId } } : undefined,
            category: rest.categoryId
              ? { connect: { id: rest.categoryId } }
              : undefined,
            images: {
              create: images.map((i, idx) => ({
                ...i,
                position: i.position ?? idx,
              })),
            },
            sizeVariants: sizes ? { create: sizes } : undefined,
          },
          include: { images: true, sizeVariants: true },
        });
      }
      if (unknownArg || missingColumn) {
        // Retry without jersey fields
        return await prisma.product.create({
          data: {
            sku: rest.sku,
            name: rest.name,
            description: rest.description,
            priceCents: rest.priceCents,
            gender: rest.gender ?? undefined,
            brand: rest.brandId ? { connect: { id: rest.brandId } } : undefined,
            category: rest.categoryId
              ? { connect: { id: rest.categoryId } }
              : undefined,
            images: {
              create: images.map((i, idx) => ({
                ...i,
                position: i.position ?? idx,
              })),
            },
            sizeVariants: sizes ? { create: sizes } : undefined,
          },
          include: { images: true, sizeVariants: true },
        });
      }
      throw err;
    }
  }
  try {
    const created = await createWithFallback();
    return NextResponse.json({ product: created }, { status: 201 });
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
});

export const GET = withRequest(async function GET() {
  // Simple list for admin UI scaffolding (limit 50 newest)
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      sku: true,
      name: true,
      priceCents: true,
      createdAt: true,
      _count: { select: { images: true, sizeVariants: true } },
    },
  });
  return NextResponse.json({ products });
});
