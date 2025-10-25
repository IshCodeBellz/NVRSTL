"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/product/ProductCard";

interface SearchProduct {
  id: string;
  name: string;
  priceCents: number;
  comparePriceCents?: number | null;
  image: string;
  brandName?: string;
  categoryName?: string;
  sku: string;
  createdAt: string;
}

interface SearchData {
  items: SearchProduct[];
  total: number;
  totalCount: number;
  facets?: any;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams?.get("q") || "";
  const [data, setData] = useState<SearchData>({
    items: [],
    total: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data when query changes
  useEffect(() => {
    if (!q) {
      setData({ items: [], total: 0, totalCount: 0 });
      setLoading(false);
      setError(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Fetching data for query:", q);

        const url = `/api/search?q=${encodeURIComponent(q)}&facets=1&limit=60`;
        console.log("Fetch URL:", url);

        const res = await fetch(url);
        console.log("Response status:", res.status);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const result = await res.json();
        console.log("Data received:", result);
        setData(result);
      } catch (error) {
        console.error("Fetch error:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch data"
        );
        setData({ items: [], total: 0, totalCount: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [q]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-64 lg:shrink-0 space-y-6">
            <div>
              <h1 className="text-xl font-bold mb-1">
                Results for &ldquo;{q}&rdquo;
              </h1>
              <p className="text-xs text-neutral-500">Loading...</p>
            </div>
          </aside>
          <main className="flex-1 space-y-4 min-w-0">
            <div className="py-20 text-sm text-neutral-500 text-center border rounded">
              Loading search results...
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-64 lg:shrink-0 space-y-6">
            <div>
              <h1 className="text-xl font-bold mb-1">
                Results for &ldquo;{q}&rdquo;
              </h1>
              <p className="text-xs text-neutral-500">Error occurred</p>
            </div>
          </aside>
          <main className="flex-1 space-y-4 min-w-0">
            <div className="py-20 text-sm text-red-500 text-center border rounded">
              Error: {error}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 lg:shrink-0 space-y-6">
          <div>
            <h1 className="text-xl font-bold mb-1">
              Results for &ldquo;{q}&rdquo;
            </h1>
            <p className="text-xs text-neutral-500">
              {data.total} item{data.total === 1 ? "" : "s"} found
            </p>
          </div>
        </aside>
        <main className="flex-1 space-y-4 min-w-0">
          {data.items.length === 0 && (
            <div className="py-20 text-sm text-neutral-500 text-center border rounded">
              No results. Try adjusting filters.
            </div>
          )}
          {data.items.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {data.items.map((p: SearchProduct) => (
                <ProductCard
                  key={p.id}
                  product={{
                    id: p.id,
                    name: p.name,
                    priceCents: p.priceCents,
                    image: p.image,
                  }}
                  variant="portrait"
                  theme="dark"
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
