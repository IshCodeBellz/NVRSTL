"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ClientPrice } from "@/components/ui/ClientPrice";

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
  const [q, setQ] = useState("");
  const [data, setData] = useState<SearchData>({
    items: [],
    total: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get query from URL on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get("q") || "";
      console.log("SearchPage mounted with q:", query);
      setQ(query);
    }
  }, []);

  // Fetch data when query changes
  useEffect(() => {
    if (!q) {
      setData({ items: [], total: 0, totalCount: 0 });
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Fetching data for query:", q);

        const url = `http://localhost:3002/api/search?q=${encodeURIComponent(q)}&facets=1&limit=60`;
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
              <h1 className="text-xl font-bold mb-1">Results for "{q}"</h1>
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
              <h1 className="text-xl font-bold mb-1">Results for "{q}"</h1>
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
            <h1 className="text-xl font-bold mb-1">Results for "{q}"</h1>
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
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {data.items.map((p: SearchProduct) => (
                <li key={p.id} className="group">
                  <Link href={`/product/${p.id}`} className="block">
                    <div className="relative aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <p className="mt-3 text-sm leading-tight line-clamp-2 font-bold min-h-[2.1em] text-white font-carbon uppercase tracking-wide">
                      {p.name}
                    </p>
                    <p className="text-sm font-bold text-white">
                      <ClientPrice cents={p.priceCents} size="xs" />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
