/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import { withRequest } from "@/lib/server/logger";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { z } from "zod";
import { ExtendedSession } from "@/lib/types";

interface CartLine {
  productId: string;
  size: string | null;
  qty: number;
  priceCentsSnapshot: number;
}

export const dynamic = "force-dynamic";

const lineSchema = z.object({
  productId: z.string(),
  size: z.string().optional(),
  qty: z.number().int().min(1).max(99),
  // Carry client-side customization payload if provided (used only for price add-ons)
  customizations: z.any().optional(),
  customKey: z.string().optional().nullable(),
});
const payloadSchema = z.object({ lines: z.array(lineSchema) });

async function getOrCreateCart(userId: string) {
  // userId is unique on Cart so we can use findUnique
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: { lines: true },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: { lines: true },
    });
  }
  return cart;
}

export const GET = withRequest(async function GET() {
  const session = (await getServerSession(
    authOptionsEnhanced
  )) as ExtendedSession | null;
  const uid = session?.user?.id;
  if (!uid) return NextResponse.json({ lines: [] });
  const cart = await prisma.cart.findUnique({
    where: { userId: uid },
    include: { lines: true },
  });
  return NextResponse.json({
    lines: (cart?.lines || []).map((l: any) => ({
      productId: l.productId,
      size: l.size || undefined,
      qty: l.qty,
      priceCentsSnapshot: l.priceCentsSnapshot,
      customKey: l.customKey || undefined,
      customizations: l.customizations
        ? (() => {
            try {
              return JSON.parse(l.customizations as string);
            } catch {
              return undefined;
            }
          })()
        : undefined,
    })),
  });
});

function computeJerseyExtra(product: any, customizations: any): number {
  try {
    if (!product?.isJersey) return 0;
    const raw = (product as any).jerseyConfig;
    const conf = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    if (!conf || !customizations) return 0;
    let extra = 0;
    const { patch, patch2, sleeveAd, nameAndNumber } = customizations || {};
    const addFor = (arr: any[], key: string | undefined) => {
      if (!arr || !key) return 0;
      const found = arr.find((x: any) =>
        typeof x === "string" ? x === key : x?.key === key
      );
      if (!found || typeof found === "string") return 0;
      return found.addCents ? Number(found.addCents) || 0 : 0;
    };
    extra += addFor(conf.patches || [], patch);
    if (conf.patches2) extra += addFor(conf.patches2 || [], patch2);
    extra += addFor(conf.sleeveAds || [], sleeveAd);
    if (nameAndNumber?.font)
      extra += addFor(conf.fonts || [], nameAndNumber.font);
    return extra;
  } catch {
    return 0;
  }
}

// Replace cart
export const POST = withRequest(async function POST(req: NextRequest) {
  const session = (await getServerSession(
    authOptionsEnhanced
  )) as ExtendedSession | null;
  const uid = session?.user?.id;
  if (!uid)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const cart = await getOrCreateCart(uid);
  // Delete existing lines
  await prisma.cartLine.deleteMany({ where: { cartId: cart.id } });
  // Re-create
  const data = await Promise.all(
    parsed.data.lines.map(async (l) => {
      const product = await prisma.product.findUnique({
        where: { id: l.productId },
        include: { sizeVariants: true },
      });
      if (!product) return null;
      if (product.deletedAt) return null;
      const extraCents = computeJerseyExtra(product as any, l.customizations);
      let finalQty = l.qty;
      if (l.size) {
        const sv = product.sizeVariants.find((s) => s.label === l.size);
        if (!sv) return null;
        finalQty = Math.min(finalQty, sv.stock, 99);
        if (finalQty <= 0) return null;
      } else {
        finalQty = Math.min(finalQty, 99);
      }
      return prisma.cartLine.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          size: l.size,
          qty: finalQty,
          priceCentsSnapshot: (product.priceCents || 0) + extraCents,
          customKey: (l as any).customKey ?? null,
          customizations: (l as any).customizations
            ? JSON.stringify((l as any).customizations)
            : null,
        } as any,
      });
    })
  );
  return NextResponse.json({ ok: true, created: data.filter(Boolean).length });
});

// Merge cart (accumulate qty)
export const PATCH = withRequest(async function PATCH(req: NextRequest) {
  const session = (await getServerSession(
    authOptionsEnhanced
  )) as ExtendedSession | null;
  const uid = session?.user?.id;
  if (!uid)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const cart = await getOrCreateCart(uid);
  for (const l of parsed.data.lines) {
    const product = await prisma.product.findUnique({
      where: { id: l.productId },
      include: { sizeVariants: true },
    });
    if (!product) continue;
    if (product.deletedAt) continue;
    const existing = await prisma.cartLine.findFirst({
      where: {
        cartId: cart.id,
        productId: l.productId,
        size: l.size || null,
        customKey: (l as any).customKey ?? null,
      } as any,
    });
    let finalQty = l.qty;
    if (l.size) {
      const sv = product.sizeVariants.find((s) => s.label === l.size);
      if (!sv) continue;
      const base = existing ? existing.qty + l.qty : l.qty;
      finalQty = Math.min(base, sv.stock, 99);
      if (finalQty <= 0) continue;
    } else {
      const base = existing ? existing.qty + l.qty : l.qty;
      finalQty = Math.min(base, 99);
    }
    const extraCents = computeJerseyExtra(
      product as any,
      (l as any).customizations
    );
    if (existing) {
      await prisma.cartLine.update({
        where: { id: existing.id },
        data: {
          qty: finalQty,
          priceCentsSnapshot: (product.priceCents || 0) + extraCents,
          customizations: (l as any).customizations
            ? JSON.stringify((l as any).customizations)
            : (existing as any).customizations,
        } as any,
      });
    } else {
      await prisma.cartLine.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          size: l.size,
          qty: finalQty,
          priceCentsSnapshot: (product.priceCents || 0) + extraCents,
          customKey: (l as any).customKey ?? null,
          customizations: (l as any).customizations
            ? JSON.stringify((l as any).customizations)
            : null,
        } as any,
      });
    }
  }
  const merged = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: { lines: true },
  });
  return NextResponse.json({
    lines:
      merged?.lines.map((l: CartLine) => ({
        productId: l.productId,
        size: l.size || undefined,
        qty: l.qty,
        priceCentsSnapshot: l.priceCentsSnapshot,
      })) || [],
  });
});
