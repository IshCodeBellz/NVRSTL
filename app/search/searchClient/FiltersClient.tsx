"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

interface Facets {
  categories: { id: string; slug: string; name: string; count: number }[];
  brands: { id: string; name: string; count: number }[];
  priceRange: { min: number; max: number };
}

interface Props {
  facets: Facets;
  // active search params (server passed)
  active: Record<string, string | string[]>;
}

export default function FiltersClient({ facets, active }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [min, setMin] = useState<string>(
    Array.isArray(active.min) ? active.min[0] || "" : active.min || ""
  );
  const [max, setMax] = useState<string>(
    Array.isArray(active.max) ? active.max[0] || "" : active.max || ""
  );
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value?: string) {
    const next = new URLSearchParams(sp?.toString() || "");
    if (value && value.length) next.set(key, value);
    else next.delete(key);
    next.delete("page"); // reset pagination
    startTransition(() => router.replace(`/search?${next.toString()}`));
  }

  function toggle(key: string, value: string) {
    setParam(key, active[key] === value ? undefined : value);
  }

  function applyPrice() {
    if (min && isNaN(Number(min))) return;
    if (max && isNaN(Number(max))) return;
    setParam("min", min || undefined);
    setParam("max", max || undefined);
  }

  function clearAll() {
    const keep: string[] = ["q"]; // preserve query text
    const next = new URLSearchParams(sp?.toString() || "");
    [...next.keys()].forEach((k) => {
      if (!keep.includes(k)) next.delete(k);
    });
    router.replace(`/search?${next.toString()}`);
  }

  return (
    <div className="space-y-8 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wide uppercase text-neutral-500">
          Filters
        </h2>
        <button
          onClick={clearAll}
          className="text-[11px] underline text-neutral-500 hover:text-neutral-800 disabled:opacity-40"
          disabled={isPending}
        >
          Clear
        </button>
      </div>

      <section className="space-y-2">
        <h3 className="font-medium text-xs tracking-wide uppercase text-neutral-600">
          Category
        </h3>
        <ul className="space-y-1">
          {facets.categories.map((c) => {
            const activeCat = active.category === c.slug;
            return (
              <li key={c.id}>
                <button
                  onClick={() => toggle("category", c.slug)}
                  className={`w-full text-left px-2 py-1 rounded border text-[12px] capitalize transition ${
                    activeCat
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white border-neutral-300 hover:bg-neutral-50"
                  }`}
                  disabled={isPending}
                >
                  {c.name}
                  <span className="float-right text-[10px] opacity-60 font-medium">
                    {c.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-medium text-xs tracking-wide uppercase text-neutral-600">
          Brand
        </h3>
        <ul className="space-y-1 max-h-52 overflow-auto pr-1">
          {facets.brands.map((b) => {
            const activeBrand = active.brand === b.id;
            return (
              <li key={b.id}>
                <button
                  onClick={() => toggle("brand", b.id)}
                  className={`w-full text-left px-2 py-1 rounded border text-[12px] transition ${
                    activeBrand
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white border-neutral-300 hover:bg-neutral-50"
                  }`}
                  disabled={isPending}
                >
                  {b.name}
                  <span className="float-right text-[10px] opacity-60 font-medium">
                    {b.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-medium text-xs tracking-wide uppercase text-neutral-600">
          Price
        </h3>
        <div className="flex items-center gap-2">
          <input
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder={`${facets.priceRange.min}`}
            className="w-20 px-2 py-1 rounded border border-neutral-300 text-[12px]"
          />
          <span className="text-neutral-400">–</span>
          <input
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder={`${facets.priceRange.max}`}
            className="w-20 px-2 py-1 rounded border border-neutral-300 text-[12px]"
          />
          <button
            onClick={applyPrice}
            className="text-[11px] px-2 py-1 rounded bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
            disabled={isPending}
          >
            Go
          </button>
        </div>
      </section>
    </div>
  );
}
