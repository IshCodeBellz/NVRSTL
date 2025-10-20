"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

import Search from "../products/search"; // server wrapper -> fine inside client for Suspense boundary

interface FiltersClientProps {
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  initialBrand?: string;
  initialCategory?: string;
  initialIncludeDeleted: boolean;
}

export default function FiltersClient({
  brands,
  categories,
  initialBrand,
  initialCategory,
  initialIncludeDeleted,
}: FiltersClientProps) {
  const router = useRouter();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const url = new URL(window.location.href);
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
      // Reset pagination or other derived params if present
      url.searchParams.delete("page");
      router.push(url.toString());
    },
    [router]
  );

  return (
    <div className="flex flex-col md:flex-row gap-4 md:items-end">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium">Brand</label>
        <select
          defaultValue={initialBrand || ""}
          onChange={(e) => updateParam("brand", e.target.value || null)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium">Category</label>
        <select
          defaultValue={initialCategory || ""}
          onChange={(e) => updateParam("category", e.target.value || null)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 items-center pt-5">
        <label className="text-xs flex items-center gap-1">
          <input
            type="checkbox"
            defaultChecked={initialIncludeDeleted}
            onChange={(e) =>
              updateParam("deleted", e.target.checked ? "1" : null)
            }
          />
          Show Deleted
        </label>
      </div>
      <div className="flex-1">
        <Search />
      </div>
    </div>
  );
}
