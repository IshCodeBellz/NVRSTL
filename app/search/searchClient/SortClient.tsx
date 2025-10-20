"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "trending", label: "Trending" },
  { value: "relevance", label: "Relevance" },
];

export default function SortClient({ current }: { current: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(sp?.toString() || "");
    next.set("sort", e.target.value);
    next.delete("page");
    startTransition(() => router.replace(`/search?${next.toString()}`));
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <label htmlFor="sort" className="font-medium text-neutral-600">
        Sort
      </label>
      <select
        id="sort"
        value={current}
        onChange={onChange}
        disabled={isPending}
        className="border border-neutral-300 rounded px-2 py-1 text-xs bg-white hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
