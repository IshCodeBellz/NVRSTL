/* eslint-disable */
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

type AddressParts = {
  line1: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string; // Prefer ISO code if available
};

interface Props {
  value: string;
  country?: string; // ISO code (US/GB) or name; used to bias search
  placeholder?: string;
  onChange: (value: string) => void;
  onSelect: (parts: AddressParts) => void;
}

export default function AddressAutocomplete({
  value,
  country,
  placeholder = "Address line 1",
  onChange,
  onSelect,
}: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const countryParam = useMemo(() => {
    if (!country) return undefined;
    const c = country.trim();
    // If looks like ISO-2 code keep it, otherwise let Mapbox handle
    return c.length === 2 ? c.toUpperCase() : undefined;
  }, [country]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // If no token, render a plain input with browser autofill hints
  if (!token) {
    return (
      <input
        name="line1"
        required
        placeholder={placeholder}
        className="input"
        value={value}
        autoComplete="address-line1"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  async function search(q: string) {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const types = "address,place,postcode";
    const qp = new URLSearchParams();
    qp.set("autocomplete", "true");
    qp.set("types", types);
    qp.set("access_token", token as string);
    qp.set("limit", "5");
    if (countryParam) qp.set("country", countryParam);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      q
    )}.json?${qp.toString()}`;
    setLoading(true);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return setItems([]);
      const data = await res.json();
      setItems(Array.isArray(data.features) ? data.features : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  function handleChange(v: string) {
    onChange(v);
    if (v.trim().length >= 3) {
      search(v);
      setOpen(true);
    } else {
      setItems([]);
      setOpen(false);
    }
  }

  function pick(feature: any) {
    // Mapbox feature decomposition
    const ctx: any[] = Array.isArray(feature.context) ? feature.context : [];
    const getCtx = (prefix: string) =>
      ctx.find((c) => typeof c.id === "string" && c.id.startsWith(prefix));
    const house = feature.address || ""; // house number
    const street = feature.text || ""; // street name
    const line1 = [house, street].filter(Boolean).join(" ") || feature.text;
    const city = (getCtx("place")?.text || getCtx("locality")?.text) ?? "";
    const regionCtx = getCtx("region");
    const region =
      (regionCtx?.short_code?.split("-")?.[1] || "").toUpperCase() ||
      regionCtx?.text ||
      "";
    const postalCode = getCtx("postcode")?.text || "";
    const countryCode = (getCtx("country")?.short_code || "").toUpperCase();
    onSelect({
      line1: line1 || feature.place_name || value,
      city,
      region,
      postalCode,
      country: countryCode || country,
    });
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        name="line1"
        required
        placeholder={placeholder}
        className="input"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        autoComplete="address-line1"
        onFocus={() => {
          if (value.trim().length >= 3 && items.length > 0) setOpen(true);
        }}
      />
      {open && (items.length > 0 || loading) && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded border bg-white shadow">
          {loading && (
            <div className="px-3 py-2 text-sm text-neutral-500">Searching…</div>
          )}
          {!loading &&
            items.map((f) => (
              <button
                type="button"
                key={f.id}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
                onClick={() => pick(f)}
              >
                {f.place_name}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
