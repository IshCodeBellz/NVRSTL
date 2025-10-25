"use client";
import { useState, useEffect, useCallback } from "react";
import { InteractiveProductCard } from "@/components/product/InteractiveProductCard";
import { IsolatedSearchInput } from "@/components/ui/IsolatedSearchInput";

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
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [resetTrigger, setResetTrigger] = useState(0);

  // Handle search from isolated input
  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
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
            <IsolatedSearchInput
              placeholder="Filter new arrivals"
              onSearch={handleSearch}
              resetTrigger={resetTrigger}
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
            : items.map((p) => (
                <InteractiveProductCard
                  key={p.id}
                  product={p}
                  variant="portrait"
                  showBrand={true}
                  showCategory={true}
                />
              ))}
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
