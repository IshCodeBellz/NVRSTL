"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Result {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
}

export default function ProductsSearchClient() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    fetch(`/api/admin/products/search?q=${encodeURIComponent(q)}`, {
      signal: ac.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setResults(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [q]);

  return (
    <div className="space-y-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name or SKU..."
        className="w-full max-w-sm border rounded px-3 py-2 text-sm"
      />
      {loading && <div className="text-xs text-neutral-500">Searching…</div>}
      {results.length > 0 && (
        <div className="border rounded divide-y text-sm bg-white">
          {results.map((r) => (
            <Link
              key={r.id}
              href={`/admin/products/${r.id}`}
              className="flex items-center justify-between px-3 py-2 hover:bg-neutral-50"
            >
              <span className="truncate">{r.name}</span>
              <span className="font-mono text-[11px] text-neutral-500">
                {r.sku}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
