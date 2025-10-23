"use client";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useCart, useWishlist } from "@/components/providers/CartProvider";
import { lineIdFor } from "@/lib/types";
import Image from "next/image";
import { useToast } from "@/components/providers/ToastProvider";
import { ClientPrice } from "@/components/ui/ClientPrice";
import { SimpleSearchInput } from "@/components/ui/SimpleSearchInput";

// "Drops" shows the latest products by createdAt desc (reuses /api/products ordering)
// Provides simple client pagination (page param to API) and basic search.

interface Product {
  id: string;
  name: string;
  priceCents: number;
  price?: number;
  image: string;
  images: { url: string }[];
  category?: { name: string };
  brand?: { name: string };
  sizes: string[];
}

export default function DropsPage() {
  const { toggle, has } = useWishlist();
  const { addItem } = useCart();
  const { push } = useToast();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [resetTrigger, setResetTrigger] = useState(0);

  // Memoize the filter change callback to prevent re-renders
  const handleFilterChange = useCallback((value: string) => {
    setQuery(value);
    setPage(1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (query) params.set("q", query);
      try {
        const res = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setItems(
            (data.items || []).map((p: Partial<Product>) => ({
              id: p.id || "",
              name: p.name || "",
              priceCents: p.priceCents ?? Math.round((p.price || 0) * 100),
              price: p.price,
              image: p.image || "",
              images: p.images || [],
              category: p.category,
              brand: p.brand,
              sizes: p.sizes || [],
            }))
          );
          setTotal(data.total || 0);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [page, pageSize, query]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 to-black py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white font-carbon mb-6">
              🔥 DROPS 🔥
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto font-carbon">
              Fresh arrivals just landed. Be the first to get your hands on the
              latest drops.
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-10 space-y-10">
        <header className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-400 font-carbon">
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Loading latest products...
                </span>
              ) : (
                `Showing ${items.length} of ${total} latest items`
              )}
            </p>
          </div>
        </header>
        <div className="flex flex-wrap gap-4 items-end text-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wide font-semibold text-gray-300 font-carbon">
              Search
            </label>
            <SimpleSearchInput
              placeholder="Filter new arrivals"
              onFilterChange={handleFilterChange}
              resetTrigger={resetTrigger}
              loading={loading}
              disabled={loading}
              className="w-64"
            />
          </div>
          {(query || page > 1) && (
            <button
              onClick={() => {
                setQuery("");
                setPage(1);
                setResetTrigger((prev) => prev + 1);
              }}
              disabled={loading}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-800 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed font-carbon"
            >
              Reset
            </button>
          )}
        </div>
        {items.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400 mb-4 font-carbon">
              No new products found.
            </p>
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setPage(1);
                  setResetTrigger((prev) => prev + 1);
                }}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-800 transition-colors text-xs font-carbon"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {loading
            ? // Loading skeleton
              Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="group relative bg-gray-800 aspect-[3/4] overflow-hidden rounded-lg flex flex-col animate-pulse border border-gray-700"
                >
                  <div className="w-full h-3/4 bg-gray-700" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))
            : items.map((p) => {
                const id = lineIdFor(p.id);
                const inWish = has(id);
                const hasSizes = Array.isArray(p.sizes) && p.sizes.length > 0;
                return (
                  <div
                    key={p.id}
                    className="group relative bg-gray-800 aspect-[3/4] overflow-hidden rounded-lg flex flex-col border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:shadow-gray-900/50"
                  >
                    <Link
                      href={`/product/${p.id}`}
                      className="absolute inset-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <Image
                        src={p.image}
                        alt={p.name}
                        width={400}
                        height={500}
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                      />
                    </Link>
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                      <button
                        onClick={() => {
                          const already = inWish;
                          toggle({
                            productId: p.id,
                            name: p.name,
                            priceCents: p.priceCents,
                            image: p.image,
                          });
                          push({
                            type: already ? "info" : "success",
                            message: already ? "Removed from saved" : "Saved",
                          });
                        }}
                        className={`rounded-full h-9 w-9 text-sm font-bold flex items-center justify-center backdrop-blur bg-white/90 border shadow-lg transition-all duration-200 hover:scale-110 ${
                          inWish
                            ? "border-red-500 text-red-500"
                            : "border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-400"
                        }`}
                      >
                        {inWish ? "♥" : "♡"}
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            if (hasSizes) {
                              // Open size chooser popover (toggle) instead of immediate add
                              const host = (e.currentTarget
                                .parentElement as HTMLElement)!.querySelector<HTMLElement>(
                                "[data-size-popover]"
                              );
                              if (host) host.toggleAttribute("data-open");
                              return;
                            }
                            addItem(
                              {
                                productId: p.id,
                                name: p.name,
                                priceCents: p.priceCents,
                                image: p.image,
                              },
                              1
                            );
                            push({ type: "success", message: "Added to bag" });
                          }}
                          className="rounded-full h-9 w-9 text-lg leading-none font-bold flex items-center justify-center backdrop-blur bg-white/90 border border-gray-300 text-gray-600 shadow-lg transition-all duration-200 hover:scale-110 hover:border-green-500 hover:text-green-600"
                          aria-label={hasSizes ? "Choose size" : "Add to bag"}
                        >
                          +
                        </button>
                        {hasSizes && (
                          <div
                            data-size-popover
                            className="absolute top-9 right-0 z-20 hidden data-[open]:flex flex-col gap-1 bg-white shadow-lg border border-neutral-200 rounded p-2 min-w-[120px]"
                          >
                            <div className="text-[10px] uppercase tracking-wide font-semibold text-neutral-500 pb-1 border-b mb-1">
                              Select size
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {p.sizes.map((s: string) => (
                                <button
                                  key={s}
                                  onClick={() => {
                                    addItem(
                                      {
                                        productId: p.id,
                                        name: p.name,
                                        priceCents: p.priceCents,
                                        image: p.image,
                                        size: s,
                                      },
                                      1
                                    );
                                    push({
                                      type: "success",
                                      message: `Added ${s}`,
                                    });
                                    const host =
                                      (document.querySelector(
                                        `[data-size-popover][data-open]`
                                      ) as HTMLElement) || null;
                                    host?.removeAttribute("data-open");
                                  }}
                                  className="px-2 py-1 text-[11px] rounded border border-neutral-300 hover:bg-neutral-100 active:bg-neutral-200"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => {
                                const host =
                                  (document.querySelector(
                                    `[data-size-popover][data-open]`
                                  ) as HTMLElement) || null;
                                host?.removeAttribute("data-open");
                              }}
                              className="mt-2 text-[10px] text-neutral-500 hover:text-neutral-700"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent text-white">
                      <div
                        className="font-bold text-sm truncate font-carbon uppercase tracking-wide mb-2"
                        title={p.name}
                      >
                        {p.name}
                      </div>
                      <div className="text-white">
                        <ClientPrice
                          cents={p.priceCents}
                          size="sm"
                          className="text-white font-bold font-carbon"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-4 justify-center pt-4">
            <button
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-800 transition-colors text-xs disabled:opacity-40 disabled:cursor-not-allowed font-carbon"
            >
              Prev
            </button>
            <span className="text-xs text-gray-400 font-carbon">
              Page {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-800 transition-colors text-xs disabled:opacity-40 disabled:cursor-not-allowed font-carbon"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
