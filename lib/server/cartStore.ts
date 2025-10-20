/* eslint-disable */
// Hybrid cart store: DB persistence with graceful memory fallback.
// Public async API maintained for easy future swap (e.g., Redis).
import { CartItem } from "../types";
import {
  getCartLines,
  replaceCart,
  mergeCart,
  clearCart,
} from "@/lib/server/cartRepository";
import { prisma } from "./prisma";

let memoryFallback = false;
interface MemRecord {
  items: CartItem[];
  updatedAt: number;
}
const mem = new Map<string, MemRecord>();

async function toCartItems(
  dbLines: {
    productId: string;
    size?: string;
    qty: number;
    priceCentsSnapshot: number;
  }[]
): Promise<CartItem[]> {
  if (!dbLines.length) return [];
  const productIds = Array.from(new Set(dbLines.map((l) => l.productId)));
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      // Only include active, non-deleted products in cart items
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      priceCents: true,
      images: { take: 1, select: { url: true } },
    },
  });
  const pMap = new Map(products.map((p) => [p.id, p] as const));
  return dbLines.map((l) => {
    const p = pMap.get(l.productId);
    return {
      id: `${l.productId}${l.size ? `__${l.size}` : ""}`,
      productId: l.productId,
      name: p?.name || "Unknown",
      priceCents: l.priceCentsSnapshot,
      image: p?.images?.[0]?.url || "/placeholder.svg",
      size: l.size || undefined,
      // Preserve any server-stored customKey/customizations if they exist (future-proof)
      lineKey: (l as any).customKey || undefined,
      customizations: (l as any).customizations
        ? JSON.parse((l as any).customizations)
        : undefined,
      qty: l.qty,
    };
  });
}

export async function getUserCart(userId: string): Promise<CartItem[]> {
  if (memoryFallback) return mem.get(userId)?.items || [];
  try {
    const lines = await getCartLines(userId);
    return await toCartItems(lines);
  } catch {
    memoryFallback = true;
    return mem.get(userId)?.items || [];
  }
}

export async function setUserCart(userId: string, items: CartItem[]) {
  if (memoryFallback) {
    mem.set(userId, { items, updatedAt: Date.now() });
    return;
  }
  try {
    await replaceCart(
      userId,
      items.map((i) => ({
        productId: i.productId,
        size: i.size,
        qty: i.qty,
        priceCentsSnapshot: i.priceCents,
      }))
    );
  } catch {
    memoryFallback = true;
    mem.set(userId, { items, updatedAt: Date.now() });
  }
}

export async function mergeUserCart(userId: string, incoming: CartItem[]) {
  if (memoryFallback) {
    const existing = mem.get(userId)?.items || [];
    const map = new Map<string, CartItem>();
    [...existing, ...incoming].forEach((l) => {
      const prev = map.get(l.id);
      if (prev) map.set(l.id, { ...prev, qty: Math.min(99, prev.qty + l.qty) });
      else map.set(l.id, l);
    });
    const merged = Array.from(map.values());
    mem.set(userId, { items: merged, updatedAt: Date.now() });
    return merged;
  }
  try {
    const merged = await mergeCart(
      userId,
      incoming.map((i) => ({
        productId: i.productId,
        size: i.size,
        qty: i.qty,
        priceCentsSnapshot: i.priceCents,
      }))
    );
    return await toCartItems(merged);
  } catch {
    memoryFallback = true;
    return mergeUserCart(userId, incoming); // retry in fallback
  }
}

export async function clearUserCart(userId: string) {
  if (memoryFallback) {
    mem.delete(userId);
    return;
  }
  try {
    await clearCart(userId);
  } catch {
    memoryFallback = true;
    mem.delete(userId);
  }
}

// GC for memory fallback
setInterval(() => {
  if (!memoryFallback) return;
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  for (const [k, v] of mem.entries()) if (v.updatedAt < cutoff) mem.delete(k);
}, 30 * 60 * 1000).unref?.();
