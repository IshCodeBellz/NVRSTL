"use client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useWishlist, useCart } from "@/components/providers/CartProvider";
import { useState, useEffect, useRef } from "react";
import { lineIdFor } from "@/lib/types";
import Image from "next/image";

interface ProductResponse {
  id: string;
  name: string;
  priceCents: number;
  price?: number;
  images: Array<{ url: string; alt?: string }>;
  brand?: { name: string };
  sizes?: Array<{ label: string; stock: number }>;
}

interface ProductsAPIResponse {
  items: ProductResponse[];
  total: number;
  page: number;
  totalPages: number;
}
import { useToast } from "@/components/providers/ToastProvider";
import { ClientPrice } from "@/components/ui/ClientPrice";

const validCategories = [
  "womens-clothing",
  "mens-clothing",
  "womens",
  "mens",
  "denim",
  "footwear",
  "accessories",
  "sportswear",
  "dresses",
  "outerwear",
  "brands",
];

export default function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const { toggle, has } = useWishlist();
  const { addItem } = useCart();
  const { push } = useToast();

  // Initialize all state hooks first
  const category = params.category.toLowerCase();
  const [size, setSize] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [availableBrands, setAvailableBrands] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [price, setPrice] = useState<[number, number]>([0, 200]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200]); // Dynamic range based on actual products
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<
    Array<{
      id: string;
      name: string;
      priceCents: number;
      price?: number;
      imageUrl?: string;
      image?: string;
      sizes?: string[];
      brand?: { name: string };
      category?: { name: string };
    }>
  >([]);
  const viewedRef = useRef<Set<string>>(new Set());

  // Detect gender prefix from full pathname (for /women/<sub> or /men/<sub> wrappers) or direct routes
  const [genderFilter, setGenderFilter] = useState<string | undefined>(
    undefined
  );
  useEffect(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith("/women/")) setGenderFilter("women");
      else if (path.startsWith("/men/")) setGenderFilter("men");
      else if (path === "/womens" || category === "womens")
        setGenderFilter("women");
      else if (path === "/mens" || category === "mens") setGenderFilter("men");
      else setGenderFilter(undefined);
    }
  }, [params.category, category]);

  // Debounce the search query to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 1000); // 1000ms debounce delay

    return () => clearTimeout(timer);
  }, [query]);

  // Effect to calculate dynamic price range from all products in category
  useEffect(() => {
    const controller = new AbortController();
    async function loadPriceRange() {
      try {
        const params = new URLSearchParams();
        params.set("category", category);
        params.set("limit", "1000"); // Get more products to calculate accurate range

        if (genderFilter) params.set("gender", genderFilter);
        const res = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal,
        });

        if (res.ok) {
          const data: ProductsAPIResponse = await res.json();
          const products = (data.items || []).map((p: ProductResponse) => ({
            ...p,
            priceCents: p.priceCents ?? Math.round((p.price || 0) * 100),
          }));

          if (products.length > 0) {
            const prices = products.map((p: ProductResponse) =>
              Math.round(p.priceCents / 100)
            );
            const minPrice = Math.max(0, Math.min(...prices));
            const maxPrice = Math.max(...prices);

            // Round to nice numbers for better UX
            const roundedMin = Math.floor(minPrice / 10) * 10;
            const roundedMax = Math.ceil(maxPrice / 10) * 10;

            setPriceRange([roundedMin, roundedMax]);

            // Reset price filter to new range if it's still at default
            if (price[0] === 0 && price[1] === 200) {
              setPrice([roundedMin, roundedMax]);
            }
          }
        }
      } catch {
        // Keep default range on error
      }
    }

    loadPriceRange();
    return () => controller.abort();
  }, [category, genderFilter, price]); // Include all dependencies

  // Load available brands for this category
  useEffect(() => {
    const controller = new AbortController();
    async function loadBrands() {
      try {
        const res = await fetch(`/api/categories/${category}/brands`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableBrands(data || []);
        }
      } catch {
        // Keep empty brands on error
      }
    }
    loadBrands();
    return () => controller.abort();
  }, [category]);

  useEffect(() => {
    // If navigating to face-body, ensure any previously selected apparel size is cleared
    if (category === "face-body" && size) {
      setSize("");
    }
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("category", category);
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (brand) params.set("brand", brand);
      // Only include size filter for non face-body categories (apparel sizing)
      if (size && category !== "face-body") params.set("size", size);
      if (price[0] !== priceRange[0]) params.set("min", String(price[0]));
      if (price[1] !== priceRange[1]) params.set("max", String(price[1]));
      try {
        if (genderFilter) params.set("gender", genderFilter);
        const res = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          // normalize to ensure priceCents present (API already provides priceCents + legacy price)
          setItems(
            (data.items || []).map((p: ProductResponse) => ({
              ...p,
              priceCents: p.priceCents ?? Math.round((p.price || 0) * 100),
            }))
          );
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [category, debouncedQuery, brand, size, price, priceRange, genderFilter]);

  // Validate category after all hooks
  if (!validCategories.includes(category)) return notFound();

  const isFaceBody = category === "face-body";
  return (
    <div className="container mx-auto px-4 py-10 space-y-10">
      {isFaceBody && (
        <section className="relative h-64 md:h-80 w-full overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Image
            src="https://picsum.photos/seed/facebody-hero/1600/900"
            alt="Face and body care assortment"
            layout="fill"
            objectFit="cover"
            className="absolute inset-0 w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="relative z-10 h-full flex flex-col justify-end p-6 md:p-10 text-white">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Face + Body
            </h1>
            <p className="mt-2 max-w-xl text-sm md:text-base text-neutral-100">
              Skincare, grooming & body care essentials — hydrate, protect and
              glow.
            </p>
          </div>
        </section>
      )}
      <header className="flex flex-col md:flex-row md:items-end gap-4">
        <h1
          className={`text-3xl font-bold capitalize ${
            isFaceBody ? "sr-only" : ""
          }`}
        >
          {category}
        </h1>
        <div className="flex items-center gap-2">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                Loading products...
              </span>
            ) : (
              `Showing ${items.length} item${items.length !== 1 ? "s" : ""}`
            )}
          </p>
        </div>
      </header>
      <div className="flex flex-wrap gap-4 items-end text-sm">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="product-search"
            className="text-xs uppercase tracking-wide font-semibold"
          >
            Search
          </label>
          <input
            id="product-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter in page"
            disabled={loading}
            className="border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {!isFaceBody && (
          <div className="flex flex-col gap-1">
            <label
              htmlFor="size-filter"
              className="text-xs uppercase tracking-wide font-semibold"
            >
              Size
            </label>
            <select
              id="size-filter"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              disabled={loading}
              className="border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              {["XS", "S", "M", "L", "XL"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
        {availableBrands.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wide font-semibold">
              Brand
            </label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={loading}
              className="border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All brands</option>
              {availableBrands.map(
                (b: {
                  id: string;
                  name: string;
                  slug?: string;
                  productCount?: number;
                }) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name} ({b.productCount})
                  </option>
                )
              )}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide font-semibold">
            Price{" "}
            <span className="inline-flex items-center gap-1">
              <ClientPrice cents={price[0] * 100} size="xs" />
              {" - "}
              <ClientPrice cents={price[1] * 100} size="xs" />
            </span>
          </label>
          <div className="flex items-center gap-2 w-56">
            <input
              type="range"
              min={priceRange[0]}
              max={priceRange[1]}
              value={price[0]}
              onChange={(e) => setPrice([Number(e.target.value), price[1]])}
              disabled={loading}
              className="w-full disabled:opacity-50"
            />
            <input
              type="range"
              min={priceRange[0]}
              max={priceRange[1]}
              value={price[1]}
              onChange={(e) => setPrice([price[0], Number(e.target.value)])}
              disabled={loading}
              className="w-full disabled:opacity-50"
            />
          </div>
        </div>
        {(size ||
          brand ||
          query ||
          price[0] !== priceRange[0] ||
          price[1] !== priceRange[1]) && (
          <button
            onClick={() => {
              setSize("");
              setBrand("");
              setQuery("");
              setPrice([priceRange[0], priceRange[1]]);
            }}
            disabled={loading}
            className="btn-outline text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 20 }).map((_, index) => (
            <div
              key={index}
              className="group relative bg-neutral-100 dark:bg-neutral-800 aspect-[3/4] overflow-hidden rounded flex flex-col animate-pulse"
            >
              {/* Image skeleton */}
              <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700" />

              {/* Action buttons skeleton */}
              <div className="absolute top-2 right-2 flex flex-col gap-2">
                <div className="rounded-full h-8 w-8 bg-neutral-300 dark:bg-neutral-600" />
                <div className="rounded-full h-8 w-8 bg-neutral-300 dark:bg-neutral-600" />
              </div>

              {/* Content skeleton */}
              <div className="absolute inset-x-0 bottom-0 p-2 space-y-2">
                <div className="h-3 bg-neutral-300 dark:bg-neutral-600 rounded w-3/4" />
                <div className="h-3 bg-neutral-300 dark:bg-neutral-600 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          // Empty state
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.18 0-4.157.91-5.556 2.376M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              No products found
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 mb-4">
              Try adjusting your search or filter criteria
            </p>
            {(size ||
              brand ||
              query ||
              price[0] !== priceRange[0] ||
              price[1] !== priceRange[1]) && (
              <button
                onClick={() => {
                  setSize("");
                  setBrand("");
                  setQuery("");
                  setPrice([priceRange[0], priceRange[1]]);
                }}
                className="bg-black text-white px-6 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          // Products grid
          items.map((p) => {
            const id = lineIdFor(p.id);
            const inWish = has(id);
            const hasSizes = Array.isArray(p.sizes) && p.sizes.length > 0;
            // Local ephemeral chosen size per product (keyed by id) – simple ref via data attribute
            return (
              <div
                key={p.id}
                className="group relative bg-neutral-100 aspect-[3/4] overflow-hidden rounded flex flex-col"
                ref={(el) => {
                  if (!el) return;
                  if (viewedRef.current.has(p.id)) return;
                  const io = new IntersectionObserver(
                    (entries) => {
                      entries.forEach((e) => {
                        if (e.isIntersecting) {
                          viewedRef.current.add(p.id);
                          try {
                            navigator.sendBeacon?.(
                              "/api/events",
                              new Blob(
                                [
                                  JSON.stringify([
                                    { productId: p.id, type: "VIEW" },
                                  ]),
                                ],
                                { type: "application/json" }
                              )
                            );
                          } catch {}
                          io.disconnect();
                        }
                      });
                    },
                    { threshold: 0.4 }
                  );
                  io.observe(el);
                }}
              >
                {/* Full-card clickable layer (beneath controls) */}
                <Link
                  href={`/product/${p.id}`}
                  className="absolute inset-0 z-[1]"
                  aria-label={`View ${p.name}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <Image
                    src={p.image || "/placeholder.png"}
                    alt={p.name}
                    width={300}
                    height={300}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                  />
                </Link>
                {/* Action buttons stack above link */}
                <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
                  <button
                    onClick={() => {
                      const already = inWish;
                      toggle({
                        productId: p.id,
                        name: p.name,
                        priceCents: p.priceCents,
                        image: p.image || p.imageUrl || "",
                      });
                      try {
                        navigator.sendBeacon?.(
                          "/api/events",
                          new Blob(
                            [
                              JSON.stringify([
                                {
                                  productId: p.id,
                                  type: already ? "UNWISHLIST" : "WISHLIST",
                                },
                              ]),
                            ],
                            { type: "application/json" }
                          )
                        );
                      } catch {}
                      push({
                        type: already ? "info" : "success",
                        message: already ? "Removed from saved" : "Saved",
                      });
                    }}
                    className={`rounded-full h-8 w-8 text-[11px] font-semibold flex items-center justify-center backdrop-blur bg-white/80 border ${
                      inWish ? "border-neutral-900" : "border-transparent"
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
                            image: p.image || p.imageUrl || "",
                          },
                          1
                        );
                        try {
                          navigator.sendBeacon?.(
                            "/api/events",
                            new Blob(
                              [
                                JSON.stringify([
                                  { productId: p.id, type: "ADD_TO_CART" },
                                ]),
                              ],
                              { type: "application/json" }
                            )
                          );
                        } catch {}
                        push({ type: "success", message: "Added to bag" });
                      }}
                      className="rounded-full h-8 w-8 text-[15px] leading-none font-semibold flex items-center justify-center backdrop-blur bg-white/80 border border-transparent"
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
                          {p.sizes?.map((s: string) => (
                            <button
                              key={s}
                              onClick={() => {
                                addItem(
                                  {
                                    productId: p.id,
                                    name: p.name,
                                    priceCents: p.priceCents,
                                    image: p.image || p.imageUrl || "",
                                    size: s,
                                  },
                                  1
                                );
                                try {
                                  navigator.sendBeacon?.(
                                    "/api/events",
                                    new Blob(
                                      [
                                        JSON.stringify([
                                          {
                                            productId: p.id,
                                            type: "ADD_TO_CART",
                                          },
                                        ]),
                                      ],
                                      { type: "application/json" }
                                    )
                                  );
                                } catch {}
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
                {/* Info overlay should not block navigation */}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs pointer-events-none z-10">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-white">
                    <ClientPrice
                      cents={p.priceCents}
                      size="sm"
                      className="text-white"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
