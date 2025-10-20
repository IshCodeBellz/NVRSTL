/* eslint-disable */
"use client";
import { useState } from "react";
import { useCart, useWishlist } from "@/components/providers/CartProvider";
import { lineIdFor } from "@/lib/types";
import { useToast } from "@/components/providers/ToastProvider";

interface ProductClientProps {
  product: {
    id: string;
    name: string;
    priceCents: number;
    image: string;
    description: string;
    sizes: string[];
    images: string[];
    isJersey?: boolean;
    jerseyConfig?: string | null;
  };
}

export default function ProductClient({ product }: ProductClientProps) {
  const [size, setSize] = useState<string>("");
  const [isJersey] = useState<boolean>(!!product.isJersey);
  const [patch, setPatch] = useState<string>("none");
  const [sleeveAd, setSleeveAd] = useState<string>("none");
  const [font, setFont] = useState<"" | "league" | "ucl">("");
  const [playerName, setPlayerName] = useState("");
  const [playerNumber, setPlayerNumber] = useState("");
  const [notes, setNotes] = useState("");
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();
  const customKey = `${patch}|${sleeveAd}|${
    font ? `f:${font}:${playerName.trim()}#${playerNumber.trim()}` : "none"
  }`;
  const wishId = lineIdFor(
    product.id,
    size || undefined,
    isJersey ? customKey : undefined
  );
  const { push } = useToast();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (product.sizes.length && !size) {
      alert("Please select a size");
      return;
    }
    if (isJersey && font && (!playerName.trim() || !playerNumber.trim())) {
      alert("Please enter both name and number.");
      return;
    }
    addItem(
      {
        productId: product.id,
        name: product.name,
        priceCents: product.priceCents,
        image: product.image,
        size: size || undefined,
        lineKey: isJersey ? customKey : undefined,
        customizations: isJersey
          ? {
              patch: (patch as any) || "none",
              sleeveAd: (sleeveAd as any) || "none",
              nameAndNumber: font
                ? { font, name: playerName.trim(), number: playerNumber.trim() }
                : null,
              notes: notes.trim() || undefined,
            }
          : undefined,
      },
      1
    );
    push({ type: "success", message: "Added to bag" });
  }

  function handleWishlist() {
    toggle({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      image: product.image,
      size: size || undefined,
    });
    push({
      type: has(wishId) ? "info" : "success",
      message: has(wishId) ? "Removed from saved" : "Saved",
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleAdd}>
      {isJersey && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1">
              Patch
            </label>
            <div className="flex gap-2">
              {["premier_league", "ucl", "league_cup", "none"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPatch(p)}
                  className={`border rounded px-3 py-1 text-xs ${
                    patch === p ? "border-neutral-900" : "border-neutral-300"
                  }`}
                >
                  {p.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1">
              Sleeve AD
            </label>
            <div className="flex gap-2">
              {["visit_rwanda", "none"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSleeveAd(s)}
                  className={`border rounded px-3 py-1 text-xs ${
                    sleeveAd === s ? "border-neutral-900" : "border-neutral-300"
                  }`}
                >
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1">
              Name And Number
            </label>
            <div className="flex gap-2 flex-wrap">
              {["league", "ucl", "none"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() =>
                    setFont((f as any) === "none" ? "" : (f as any))
                  }
                  className={`border rounded px-3 py-1 text-xs ${
                    (font || "none") === f
                      ? "border-neutral-900"
                      : "border-neutral-300"
                  }`}
                >
                  {f === "none" ? "No Name No Number" : f.toUpperCase()}
                </button>
              ))}
            </div>
            {font && (
              <div className="mt-2 grid grid-cols-1 gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Number"
                  value={playerNumber}
                  onChange={(e) => setPlayerNumber(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            )}
            <div className="mt-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!notes}
                  onChange={(e) =>
                    setNotes(e.target.checked ? notes || "" : "")
                  }
                />
                Customized Requirements
              </label>
              {notes !== "" && (
                <textarea
                  className="mt-2 w-full border rounded px-3 py-2 text-sm min-h-[100px]"
                  placeholder="Name:\nNumber:"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {product.sizes.length > 0 && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1">
            Size
          </label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
          >
            <option value="">Select size</option>
            {product.sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}
      <button type="submit" className="btn-primary w-full">
        Add to bag
      </button>
      <button
        type="button"
        onClick={handleWishlist}
        className={`btn-outline w-full ${
          has(wishId) ? "border-neutral-900" : ""
        }`}
      >
        {has(wishId) ? "Remove from saved" : "Save for later"}
      </button>
    </form>
  );
}
