/* eslint-disable */
"use client";
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "./CartProvider";
import { lineIdFor } from "@/lib/types";

interface ServerCartLine {
  productId: string;
  size?: string;
  qty: number;
  priceCentsSnapshot: number;
}

// Enhanced sync strategy:
// 1. On first auth mount, fetch server cart.
//    a. If server empty & local has items -> PATCH (merge add).
//    b. If server has items & local empty -> hydrate local.
//    c. If both have items -> merge (sum, capped at 99) then POST full set.
// 2. After initial sync, debounce local changes (400ms) and POST full replacement.
// 3. Silent failure tolerance (never blocks UI).

export function CartSync() {
  const { data: session } = useSession();
  const { items, addItem, clear } = useCart();
  const initialSynced = useRef(false);

  // Initial merge / hydration
  useEffect(() => {
    if (!session?.user?.id) return;
    if (initialSynced.current) return;
    initialSynced.current = true;
    (async () => {
      try {
        const res = await fetch("/api/cart", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const serverLines: ServerCartLine[] = data.lines || [];
        if (serverLines.length === 0 && items.length > 0) {
          // push local to server (merge semantics)
          await fetch("/api/cart", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lines: items.map((i) => ({
                productId: i.productId,
                size: i.size,
                qty: i.qty,
                customizations: (i as any).customizations || undefined,
                customKey: (i as any).lineKey || undefined,
              })),
            }),
          });
        } else if (serverLines.length > 0 && items.length === 0) {
          // hydrate local from server (placeholder name/image; will enrich on product views)
          clear();
          for (const l of serverLines) {
            addItem(
              {
                productId: l.productId,
                size: l.size,
                name: "",
                priceCents: l.priceCentsSnapshot,
                image: "/placeholder.svg",
              },
              l.qty
            );
          }
        } else if (serverLines.length > 0 && items.length > 0) {
          // If local + server sets are identical (same line ids & quantities), skip work.
          const localMap = new Map<string, number>();
          for (const i of items) {
            localMap.set(lineIdFor(i.productId, i.size, i.lineKey), i.qty);
          }
          let identical = true;
          if (serverLines.length !== localMap.size) {
            identical = false;
          } else {
            for (const l of serverLines) {
              const id = lineIdFor(l.productId, l.size);
              if (localMap.get(id) !== l.qty) {
                identical = false;
                break;
              }
            }
          }
          if (identical) return; // nothing to sync/merge

          // Prefer local items as source of truth to avoid surprise overwrites after session refresh.
          const linesPayload = items.map((i) => ({
            productId: i.productId,
            size: i.size,
            qty: i.qty,
            customizations: (i as any).customizations || undefined,
            customKey: (i as any).lineKey || undefined,
          }));
          await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lines: linesPayload }),
          });
          // Keep local unchanged
        }
      } catch {
        // ignore errors
      }
    })();
  }, [session?.user?.id, addItem, clear, items]);

  // Debounced sync on subsequent changes
  useEffect(() => {
    if (!session?.user?.id) return;
    if (!initialSynced.current) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: items.map((i) => ({
            productId: i.productId,
            size: i.size,
            qty: i.qty,
            customizations: (i as any).customizations || undefined,
            customKey: (i as any).lineKey || undefined,
          })),
        }),
        signal: controller.signal,
      }).catch(() => {});
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [items, session?.user?.id]);

  return null;
}
