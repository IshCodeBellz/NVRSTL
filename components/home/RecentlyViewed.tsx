"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

// API response item (tolerant of different shapes)
interface ProductApiItem {
  id?: string;
  productId?: string;
  code?: string;
  name?: string;
  title?: string;
  slug?: string | null;
  image?: string;
  imageUrl?: string;
  img?: string;
  price?: number;
  priceCents?: number;
  discountPrice?: number | null;
  salePrice?: number | null;
}

// Minimal product shape expected from API
interface ProductLite {
  id: string;
  name: string;
  slug?: string | null; // optional – some API variants may not provide
  image: string;
  price: number;
  discountPrice?: number | null;
}

// LocalStorage key
const KEY = "rv.v1";

export function pushRecentlyViewed(productId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    let ids: string[] = raw ? JSON.parse(raw) : [];
    ids = [productId, ...ids.filter((x) => x !== productId)];
    if (ids.length > 24) ids.length = 24; // cap
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
}

export function RecentlyViewed() {
  const [items, setItems] = useState<ProductLite[] | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      setItems([]);
      return;
    }
    let ids: string[] = [];
    try {
      ids = JSON.parse(raw);
    } catch {
      setItems([]);
      return;
    }
    if (!ids.length) {
      setItems([]);
      return;
    }
    // Fetch summarized products by IDs (API must support ids param or adjust)
    const params = new URLSearchParams({ ids: ids.slice(0, 24).join(",") });
    fetch(`/api/products?${params.toString()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.items) {
          setItems([]);
          return;
        }
        const map = new Map<string, ProductLite>();
        for (const p of data.items as ProductApiItem[]) {
          const pid = p.id || p.productId || p.code; // tolerate alternative shapes
          if (!pid) continue;
          map.set(pid, {
            id: pid,
            name: p.name || p.title || "Unknown",
            slug: p.slug,
            image: p.image || p.imageUrl || "/placeholder.jpg",
            price: p.price || 0,
            discountPrice: p.discountPrice || p.salePrice,
          });
        }
        const ordered: ProductLite[] = ids
          .map((id) => map.get(id))
          .filter((x): x is ProductLite => Boolean(x))
          .slice(0, 12);
        setItems(ordered);
      })
      .catch(() => setItems([]));
  }, []);

  if (items === null || items.length < 3) return null;

  return (
    <section className="bg-black pt-12 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight font-carbon uppercase text-white">
            Recently Viewed
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto snap-x pb-2 -mx-4 px-4 scrollbar-thin">
          {items.map((p: ProductLite) => {
            const href = p.slug ? `/product/${p.slug}` : `/product/${p.id}`;
            return (
              <Link
                key={p.id}
                href={href}
                className="min-w-[140px] max-w-[140px] snap-start group"
              >
                <div className="relative aspect-[3/4] rounded-md overflow-hidden bg-neutral-100 ring-1 ring-neutral-200">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="140px"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 text-[11px] font-medium line-clamp-2 leading-tight font-anxler-tech tracking-wide text-white">
                  {p.name}
                </p>
                <div className="mt-1 text-[12px] font-anxler-tech tracking-wide text-white">
                  {p.discountPrice ? (
                    <>
                      <span className="text-rose-400 font-semibold mr-1">
                        £{p.discountPrice}
                      </span>
                      <span className="line-through text-gray-400">
                        £{p.price}
                      </span>
                    </>
                  ) : (
                    <span className="text-white">£{p.price}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
