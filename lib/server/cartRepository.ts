/* eslint-disable */
import { prisma } from "./prisma";

export interface PersistedCartLine {
  productId: string;
  size?: string | null;
  qty: number;
  priceCentsSnapshot: number;
  customKey?: string | null;
  customizations?: string | null;
}

export async function getCartLinesRaw(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { lines: true },
  });
  return cart?.lines || [];
}

export async function getCartLines(
  userId: string
): Promise<PersistedCartLine[]> {
  const lines = await getCartLinesRaw(userId);
  return lines.map((l) => ({
    productId: l.productId,
    size: l.size,
    qty: l.qty,
    priceCentsSnapshot: l.priceCentsSnapshot,
    customKey: (l as any).customKey ?? null,
    customizations: (l as any).customizations ?? null,
  }));
}

export async function replaceCart(userId: string, lines: PersistedCartLine[]) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  await prisma.cartLine.deleteMany({ where: { cartId: cart.id } });
  if (lines.length) {
    await prisma.$transaction(
      lines.map((l) =>
        prisma.cartLine.create({
          data: {
            cartId: cart.id,
            productId: l.productId,
            size: l.size || null,
            priceCentsSnapshot: l.priceCentsSnapshot,
            customKey: l.customKey || null,
            customizations: l.customizations || null,
          },
        })
      )
    );
  }
  return getCartLines(userId);
}

export async function mergeCart(userId: string, incoming: PersistedCartLine[]) {
  if (!incoming.length) return getCartLines(userId);
  const existing = await getCartLines(userId);
  const map = new Map<string, PersistedCartLine>();
  const key = (l: PersistedCartLine) =>
    `${l.productId}__${l.size || ""}__${l.customKey || ""}`;
  [...existing, ...incoming].forEach((l) => {
    const k = key(l);
    const prev = map.get(k);
    if (prev) map.set(k, { ...prev, qty: Math.min(99, prev.qty + l.qty) });
    else map.set(k, { ...l });
  });
  return replaceCart(userId, Array.from(map.values()));
}

export async function clearCart(userId: string) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return;
  await prisma.cartLine.deleteMany({ where: { cartId: cart.id } });
}
