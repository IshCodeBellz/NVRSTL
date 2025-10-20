/* eslint-disable */
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { BASE_CURRENCY } from "@/lib/currency";

type OptionRow = {
  key: string;
  label?: string;
  addCents?: number; // stored in cents in JSON
};

type JerseyOptions = {
  patches: OptionRow[];
  patches2?: OptionRow[];
  sleeveAds: OptionRow[];
  fonts: OptionRow[];
};

function parseValue(value?: string | null): JerseyOptions {
  if (!value) return { patches: [], sleeveAds: [], fonts: [] };
  try {
    const obj = JSON.parse(value);
    const norm = (arr: any): OptionRow[] =>
      Array.isArray(arr)
        ? arr
            .filter((x) => x && typeof x === "object")
            .map((x) => ({
              key: String(x.key ?? ""),
              label: typeof x.label === "string" ? x.label : undefined,
              addCents:
                typeof x.addCents === "number" && !Number.isNaN(x.addCents)
                  ? Math.round(x.addCents)
                  : undefined,
            }))
        : [];
    return {
      patches: norm(obj.patches),
      patches2: norm(obj.patches2),
      sleeveAds: norm(obj.sleeveAds),
      fonts: norm(obj.fonts),
    };
  } catch {
    return {
      patches: [],
      patches2: [],
      sleeveAds: [],
      fonts: [],
    } as JerseyOptions;
  }
}

function stringifyValue(opts: JerseyOptions): string {
  const clean = (rows: OptionRow[]) =>
    rows
      .map((r) => ({
        key: r.key.trim(),
        label: r.label?.trim() || undefined,
        addCents:
          typeof r.addCents === "number" && !Number.isNaN(r.addCents)
            ? Math.round(r.addCents)
            : undefined,
      }))
      .filter((r) => !!r.key);
  const payload = {
    patches: clean(opts.patches),
    patches2: clean(opts.patches2 || []),
    sleeveAds: clean(opts.sleeveAds),
    fonts: clean(opts.fonts),
  };
  return JSON.stringify(payload);
}

function centsToMajor(cents?: number): string {
  if (typeof cents !== "number" || Number.isNaN(cents)) return "";
  return (cents / 100).toFixed(2);
}

function majorToCents(v: string): number | undefined {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return undefined;
  return Math.round(n * 100);
}

function Section({
  title,
  rows,
  onChange,
}: {
  title: string;
  rows: OptionRow[];
  onChange: (rows: OptionRow[]) => void;
}) {
  const addRow = () => onChange([...rows, { key: "", label: "", addCents: 0 }]);
  const addNone = () => onChange([...rows, { key: "none" }]);
  const update = (i: number, patch: Partial<OptionRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addRow}
            className="text-xs border rounded px-2 py-1"
          >
            + Add Row
          </button>
          <button
            type="button"
            onClick={addNone}
            className="text-xs border rounded px-2 py-1"
          >
            + Add "none"
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-xs text-neutral-500">No options yet.</p>
        )}
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <input
              className="col-span-3 border rounded px-2 py-1 text-sm"
              placeholder="key (e.g. premier_league)"
              value={r.key}
              onChange={(e) => update(i, { key: e.target.value })}
            />
            <input
              className="col-span-5 border rounded px-2 py-1 text-sm"
              placeholder="Label (optional)"
              value={r.label || ""}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <div className="col-span-3 flex items-center gap-1">
              <span className="text-neutral-500 text-sm">£</span>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
                value={centsToMajor(r.addCents)}
                onChange={(e) =>
                  update(i, { addCents: majorToCents(e.target.value) })
                }
              />
              <span className="text-neutral-500 text-xs">{BASE_CURRENCY}</span>
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="col-span-1 text-xs text-red-600 underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function JerseyOptionsEditor({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (jsonString: string) => void;
}) {
  const [opts, setOpts] = useState<JerseyOptions>(() => parseValue(value));
  useEffect(() => {
    setOpts(parseValue(value));
  }, [value]);

  // propagate JSON to parent when internal state changes
  const json = useMemo(() => stringifyValue(opts), [opts]);
  useEffect(() => {
    onChange(json);
  }, [json, onChange]);

  return (
    <div className="space-y-4">
      <Section
        title="Patches"
        rows={opts.patches}
        onChange={(rows) => setOpts((p) => ({ ...p, patches: rows }))}
      />
      <Section
        title="Second Patch"
        rows={opts.patches2 || []}
        onChange={(rows) => setOpts((p) => ({ ...p, patches2: rows }))}
      />
      <Section
        title="Sleeve Ads"
        rows={opts.sleeveAds}
        onChange={(rows) => setOpts((p) => ({ ...p, sleeveAds: rows }))}
      />
      <Section
        title="Fonts"
        rows={opts.fonts}
        onChange={(rows) => setOpts((p) => ({ ...p, fonts: rows }))}
      />
      <p className="text-xs text-neutral-500">
        Prices are saved in minor units (cents). Displayed here in{" "}
        {BASE_CURRENCY} for convenience.
      </p>
    </div>
  );
}
