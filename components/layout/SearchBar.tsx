"use client";
import { cn } from "../../lib/utils";
import { Search, Loader2 } from "lucide-react";
import { HTMLAttributes, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface Suggestion {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface Props extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function SearchBar({ className }: Props) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  const router = useRouter();
  function executeSearch() {
    const query = q.trim();
    if (!query) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  useEffect(() => {
    if (!q.trim()) {
      setItems([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, {
        signal: ac.signal,
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          setItems(data.items?.slice(0, 8) || []);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [q]);

  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => {
          if (items.length) setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            executeSearch();
          }
        }}
        type="search"
        placeholder="Search for items and brands"
        className="w-full rounded-full border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 bg-neutral-100 px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <button
            type="button"
            aria-label="Search"
            onMouseDown={(e) => e.preventDefault()}
            onClick={executeSearch}
            className="p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <Search className="h-5 w-5" />
          </button>
        )}
      </div>
      {open && items.length > 0 && (
        <ul className="absolute z-50 top-full left-0 mt-2 w-full max-h-80 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg text-sm divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/product/${it.id}`}
                className="flex items-center gap-3 p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <Image
                  src={it.image}
                  alt=""
                  width={32}
                  height={40}
                  className="h-10 w-8 object-cover rounded"
                />
                <span className="flex-1 truncate">{it.name}</span>
                <span className="font-medium">${it.price.toFixed(2)}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={`/search?q=${encodeURIComponent(q)}`}
              className="block px-3 py-2 text-center text-xs uppercase tracking-wide font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              View all results
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
