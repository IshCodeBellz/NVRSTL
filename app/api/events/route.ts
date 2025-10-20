import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

// Local metric field union (mirrors ProductMetrics model fields except id/meta)
type MetricField =
  | "views"
  | "detailViews"
  | "wishlists"
  | "addToCart"
  | "purchases";

// Accepted event types and which counter they increment
const MAP: Record<string, MetricField | null> = {
  VIEW: "views",
  DETAIL_VIEW: "detailViews",
  WISHLIST: "wishlists",
  UNWISHLIST: null, // no decrement to keep API idempotent-lite
  ADD_TO_CART: "addToCart",
  PURCHASE: "purchases",
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }
  if (!Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: "Expected array" },
      { status: 400 }
    );
  }

  // Aggregate increments per product
  const agg: Record<string, Partial<Record<MetricField, number>>> = {};
  for (const evt of body) {
    if (!evt || typeof evt !== "object") continue;
    const { productId, type } = evt;
    if (typeof productId !== "string" || productId.length < 5) continue;
    const key = MAP[type];
    if (!key) continue;
    agg[productId] ||= {};
    agg[productId][key] = (agg[productId][key] || 0) + 1;
  }

  const entries = Object.entries(agg);
  if (entries.length) {
    // Use raw upsert (SQLite) to avoid needing the typed delegate (works even if generation lagged)
    // ON CONFLICT(productId) increments existing counters.
    await prisma.$transaction(
      entries.map(([productId, inc]) =>
        prisma.$executeRawUnsafe(
          `INSERT INTO "ProductMetrics" ("productId", views, "detailViews", wishlists, "addToCart", purchases, "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT("productId") DO UPDATE SET
             views = "ProductMetrics".views + EXCLUDED.views,
             "detailViews" = "ProductMetrics"."detailViews" + EXCLUDED."detailViews",
             wishlists = "ProductMetrics".wishlists + EXCLUDED.wishlists,
             "addToCart" = "ProductMetrics"."addToCart" + EXCLUDED."addToCart",
             purchases = "ProductMetrics".purchases + EXCLUDED.purchases,
             "updatedAt" = NOW()`,
          productId,
          inc.views || 0,
          inc.detailViews || 0,
          inc.wishlists || 0,
          inc.addToCart || 0,
          inc.purchases || 0
        )
      )
    );
  }

  return NextResponse.json({ ok: true, updated: entries.length });
}

export const runtime = "nodejs";
