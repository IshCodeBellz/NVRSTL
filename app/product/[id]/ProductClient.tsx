/* eslint-disable */
"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useCart, useWishlist } from "@/components/providers/CartProvider";
import { lineIdFor } from "@/lib/types";
import { pushRecentlyViewed } from "@/components/home/RecentlyViewed";
import { useToast } from "@/components/providers/ToastProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";

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
    jerseyConfig?: string | null; // JSON string with available options & price deltas
  };
}

export default function ProductClient({ product }: ProductClientProps) {
  const [size, setSize] = useState<string>("");
  // Jersey customizations
  const [isJersey] = useState<boolean>(!!product.isJersey);
  const config = useMemo(() => {
    try {
      return product.jerseyConfig ? JSON.parse(product.jerseyConfig) : null;
    } catch {
      return null;
    }
  }, [product.jerseyConfig]);
  const [patch, setPatch] = useState<string>("none");
  const [patch2, setPatch2] = useState<string>("none");
  const [sleeveAd, setSleeveAd] = useState<string>("none");
  const [font, setFont] = useState<"" | "league" | "ucl">("");
  const [playerName, setPlayerName] = useState("");
  const [playerNumber, setPlayerNumber] = useState("");
  const [, setActiveIndex] = useState(0); // Currently unused but part of future image carousel
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();
  // Compute a stable custom key based on jersey selections
  const customKey = useMemo(() => {
    if (!isJersey) return undefined;
    const parts = [
      patch !== "none" ? `p:${patch}` : "p:none",
      patch2 !== "none" ? `p2:${patch2}` : "p2:none",
      sleeveAd !== "none" ? `s:${sleeveAd}` : "s:none",
      font ? `f:${font}` : "f:none",
      font ? `nm:${playerName.trim()}#${playerNumber.trim()}` : "nm:none",
    ];
    return parts.join("|");
  }, [isJersey, patch, patch2, sleeveAd, font, playerName, playerNumber]);
  const wishId = lineIdFor(product.id, size || undefined, customKey);
  const { push } = useToast();

  // Currency helpers (use the same converter/formatter as the whole site)
  const { convertPrice, formatPrice } = useCurrency();
  const fmt = useCallback(
    (gbpCents?: number) =>
      typeof gbpCents === "number" ? formatPrice(convertPrice(gbpCents)) : "",
    [convertPrice, formatPrice]
  );
  type Opt = { key: string; label: string; addCents?: number };
  const patchOptions: Opt[] = useMemo(() => {
    if (!config?.patches)
      return ["premier_league", "ucl", "league_cup", "none"].map((k) => ({
        key: k,
        label: k.replace(/_/g, " "),
      }));
    return (config.patches as any[]).map((p: any) =>
      typeof p === "string"
        ? { key: p, label: p.replace(/_/g, " ") }
        : {
            key: p.key,
            label: p.label || p.key.replace(/_/g, " "),
            addCents: p.addCents || 0,
          }
    );
  }, [config?.patches]);
  const patch2Options: Opt[] = useMemo(() => {
    if (!config?.patches2) return [];
    return (config.patches2 as any[]).map((p: any) =>
      typeof p === "string"
        ? { key: p, label: p.replace(/_/g, " ") }
        : {
            key: p.key,
            label: p.label || p.key.replace(/_/g, " "),
            addCents: p.addCents || 0,
          }
    );
  }, [config?.patches2]);
  const sleeveOptions: Opt[] = useMemo(() => {
    if (!config?.sleeveAds)
      return ["visit_rwanda", "none"].map((k) => ({
        key: k,
        label: k.replace(/_/g, " "),
      }));
    return (config.sleeveAds as any[]).map((s: any) =>
      typeof s === "string"
        ? { key: s, label: s.replace(/_/g, " ") }
        : {
            key: s.key,
            label: s.label || s.key.replace(/_/g, " "),
            addCents: s.addCents || 0,
          }
    );
  }, [config?.sleeveAds]);
  const fontOptions: Opt[] = useMemo(() => {
    if (!config?.fonts)
      return ["league", "ucl", "none"].map((k) => ({
        key: k,
        label: k === "none" ? "No Name No Number" : k.toUpperCase(),
      }));
    return (config.fonts as any[]).map((f: any) =>
      typeof f === "string"
        ? {
            key: f,
            label:
              f === "none" ? "No Name No Number" : (f as string).toUpperCase(),
          }
        : {
            key: f.key,
            label:
              f.label ||
              (f.key === "none"
                ? "No Name No Number"
                : String(f.key).toUpperCase()),
            addCents: f.addCents || 0,
          }
    );
  }, [config?.fonts]);
  const extraCents = useMemo(() => {
    let total = 0;
    const p = patchOptions.find((x) => x.key === patch);
    if (p?.addCents) total += p.addCents;
    const p2 = patch2Options.find((x) => x.key === patch2);
    if (p2?.addCents) total += p2.addCents;
    const s = sleeveOptions.find((x) => x.key === sleeveAd);
    if (s?.addCents) total += s.addCents;
    const f = font ? fontOptions.find((x) => x.key === font) : undefined;
    if (f?.addCents) total += f.addCents;
    return total;
  }, [
    patch,
    patch2,
    sleeveAd,
    font,
    patchOptions,
    patch2Options,
    sleeveOptions,
    fontOptions,
  ]);

  // Track recently viewed (client only, once on mount / product change)
  useEffect(() => {
    pushRecentlyViewed(product.id);
    // Fire a DETAIL_VIEW engagement event
    try {
      navigator.sendBeacon?.(
        "/api/events",
        new Blob(
          [JSON.stringify([{ productId: product.id, type: "DETAIL_VIEW" }])],
          { type: "application/json" }
        )
      );
    } catch {}
  }, [product.id]);

  // Gallery interaction & enhancements (keyboard, swipe, preload, zoom modal)
  useEffect(() => {
    if (!Array.isArray(product.images) || product.images.length === 0) return;
    const root = document.getElementById("gallery-root");
    if (!root) return;
    const slides = Array.from(
      root.querySelectorAll<HTMLDivElement>("[id^='image-']")
    );
    const counter = document.getElementById("gallery-counter");
    const zoomModal = document.getElementById("gallery-zoom-modal");
    const zoomSlides = zoomModal
      ? Array.from(
          zoomModal.querySelectorAll<HTMLDivElement>("[data-zoom-index]")
        )
      : [];
    const zoomCounter = document.getElementById("zoom-counter");
    const zoomButton = root.querySelector<HTMLButtonElement>(
      "[data-gallery-zoom]"
    );
    const zoomClose =
      zoomModal?.querySelector<HTMLButtonElement>("[data-zoom-close]");
    const zoomPrev =
      zoomModal?.querySelector<HTMLButtonElement>("[data-zoom-prev]");
    const zoomNext =
      zoomModal?.querySelector<HTMLButtonElement>("[data-zoom-next]");

    let active = 0;
    let zoomOpen = false;
    let touchStartX: number | null = null;
    let touchStartY: number | null = null;

    function updateCounter() {
      if (counter) counter.textContent = `${active + 1} / ${slides.length}`;
      if (zoomCounter)
        zoomCounter.textContent = `${active + 1} / ${slides.length}`;
    }
    function setActive(i: number) {
      active = (i + slides.length) % slides.length;
      slides.forEach((el, idx) =>
        el.setAttribute("data-active", String(idx === active))
      );
      zoomSlides.forEach((el, idx) =>
        el.setAttribute("data-active", String(idx === active))
      );
      setActiveIndex(active);
      updateCounter();
      preloadAdjacent(active);
    }
    function handlePrev() {
      setActive(active - 1);
    }
    function handleNext() {
      setActive(active + 1);
    }

    function preloadAdjacent(i: number) {
      const ahead = [
        (i + 1) % slides.length,
        (i - 1 + slides.length) % slides.length,
      ];
      ahead.forEach((idx) => {
        const imgEl = slides[idx].querySelector<HTMLImageElement>("img");
        const src = imgEl?.getAttribute("src");
        if (src) {
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.as = "image";
          link.href = src;
          document.head.appendChild(link);
          // Clean up later
          setTimeout(() => link.remove(), 4000);
        }
      });
    }

    // Initial activation
    setActive(0);

    const prevBtn = document.querySelector<HTMLButtonElement>(
      "[data-gallery-prev]"
    );
    const nextBtn = document.querySelector<HTMLButtonElement>(
      "[data-gallery-next]"
    );
    prevBtn?.addEventListener("click", handlePrev);
    nextBtn?.addEventListener("click", handleNext);

    // Hash navigation (thumbnail anchor clicks)
    function hashListener() {
      const hash = window.location.hash;
      if (hash.startsWith("#image-")) {
        const idx = parseInt(hash.replace("#image-", ""), 10);
        if (!Number.isNaN(idx) && idx >= 0 && idx < slides.length)
          setActive(idx);
      }
    }
    window.addEventListener("hashchange", hashListener);
    hashListener();

    // Keyboard navigation (Left/Right arrows + Escape closes zoom)
    function keyListener(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Escape" && zoomOpen) {
        closeZoom();
      }
    }
    root.addEventListener("keydown", keyListener);
    document.addEventListener("keydown", keyListener);

    // Swipe gestures
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
    function onTouchMove(e: TouchEvent) {
      // prevent vertical scroll hijack threshold
      if (touchStartX == null || touchStartY == null) return;
      const dx = e.touches[0].clientX - touchStartX;
      const dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (Math.abs(dx) > 30 && dy < 40) {
        if (dx > 0) handlePrev();
        else handleNext();
        touchStartX = null;
        touchStartY = null;
      }
    }
    function onTouchEnd() {
      touchStartX = null;
      touchStartY = null;
    }
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });

    // Zoom modal management
    function openZoom() {
      if (!zoomModal) return;
      zoomModal.classList.remove("hidden");
      zoomModal.classList.add("flex");
      zoomOpen = true;
      setActive(active); // sync active slide
      (
        zoomModal.querySelector("[data-zoom-close]") as HTMLElement | null
      )?.focus();
      document.documentElement.style.overflow = "hidden";
    }
    function closeZoom() {
      if (!zoomModal) return;
      zoomModal.classList.add("hidden");
      zoomModal.classList.remove("flex");
      zoomOpen = false;
      document.documentElement.style.overflow = "";
      root?.focus();
    }
    zoomButton?.addEventListener("click", openZoom);
    zoomClose?.addEventListener("click", closeZoom);
    zoomPrev?.addEventListener("click", handlePrev);
    zoomNext?.addEventListener("click", handleNext);
    function backdropClose(e: MouseEvent) {
      if (e.target === zoomModal) closeZoom();
    }
    zoomModal?.addEventListener("click", backdropClose);

    // Clean up
    return () => {
      prevBtn?.removeEventListener("click", handlePrev);
      nextBtn?.removeEventListener("click", handleNext);
      window.removeEventListener("hashchange", hashListener);
      root.removeEventListener("keydown", keyListener);
      document.removeEventListener("keydown", keyListener);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      zoomButton?.removeEventListener("click", openZoom);
      zoomClose?.removeEventListener("click", closeZoom);
      zoomPrev?.removeEventListener("click", handlePrev);
      zoomNext?.removeEventListener("click", handleNext);
      zoomModal?.removeEventListener("click", backdropClose);
    };
  }, [product.images]);

  function handleWishlist() {
    toggle({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      image: product.image,
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (Array.isArray(product.sizes) && product.sizes.length > 0 && !size) {
      push({ type: "error", message: "Please select a size" });
      return;
    }
    if (isJersey && font && (!playerName.trim() || !playerNumber.trim())) {
      push({ type: "error", message: "Please enter both name and number." });
      return;
    }
    const customizations = isJersey
      ? {
          patch: (patch as any) || "none",
          patch2: (patch2 as any) || "none",
          sleeveAd: (sleeveAd as any) || "none",
          nameAndNumber: font
            ? { font, name: playerName.trim(), number: playerNumber.trim() }
            : null,
        }
      : undefined;
    addItem(
      {
        productId: product.id,
        name: product.name,
        priceCents: (product.priceCents || 0) + (extraCents || 0),
        image:
          product.image || (product.images?.[0] ?? "") || "/placeholder.svg",
        size: size || undefined,
        lineKey: customKey,
        customizations,
      },
      1
    );
    push({ type: "success", message: "Added to bag" });
  }

  return (
    <form onSubmit={handleAdd} className="space-y-4">
      {Array.isArray(product.sizes) && product.sizes.length > 0 && (
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

      {isJersey && (
        <div className="space-y-4">
          {patchOptions.length > 0 && (
            <div>
              <h3 className="font-semibold">Patch</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {patchOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.key}
                    className={`border rounded px-3 py-2 text-sm ${
                      patch === opt.key
                        ? "border-neutral-900"
                        : "border-neutral-300"
                    }`}
                    onClick={() => setPatch(opt.key)}
                  >
                    {opt.label}
                    {opt.addCents ? (
                      <span className="ml-1 text-red-600">
                        (+{fmt(opt.addCents)})
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          )}
          {patch2Options.length > 0 && (
            <div>
              <h3 className="font-semibold">Second Patch</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {patch2Options.map((opt) => (
                  <button
                    type="button"
                    key={opt.key}
                    className={`border rounded px-3 py-2 text-sm ${
                      patch2 === opt.key
                        ? "border-neutral-900"
                        : "border-neutral-300"
                    }`}
                    onClick={() => setPatch2(opt.key)}
                  >
                    {opt.label}
                    {opt.addCents ? (
                      <span className="ml-1 text-red-600">
                        (+{fmt(opt.addCents)})
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          )}
          {sleeveOptions.length > 0 && (
            <div>
              <h3 className="font-semibold">Sleeve AD</h3>
              <div className="mt-2 flex gap-2 flex-wrap">
                {sleeveOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.key}
                    className={`border rounded px-3 py-2 text-sm ${
                      sleeveAd === opt.key
                        ? "border-neutral-900"
                        : "border-neutral-300"
                    }`}
                    onClick={() => setSleeveAd(opt.key)}
                  >
                    {opt.label}
                    {opt.addCents ? (
                      <span className="ml-1 text-red-600">
                        (+{fmt(opt.addCents)})
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          )}
          {fontOptions.length > 0 && (
            <div>
              <h3 className="font-semibold">Name And Number</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {fontOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.key}
                    className={`border rounded px-3 py-2 text-sm ${
                      (font || "none") === opt.key
                        ? "border-neutral-900"
                        : "border-neutral-300"
                    }`}
                    onClick={() =>
                      setFont(
                        (opt.key as any) === "none" ? "" : (opt.key as any)
                      )
                    }
                  >
                    {opt.label}
                    {opt.addCents ? (
                      <span className="ml-1 text-red-600">
                        (+{fmt(opt.addCents)})
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              {font && (
                <div className="mt-3 grid grid-cols-1 gap-2">
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
            </div>
          )}
        </div>
      )}

      {isJersey && (
        <div className="bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded p-3 text-sm">
          <div className="font-semibold mb-1">Your selection</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Patch:{" "}
              {patchOptions.find((o) => o.key === patch)?.label || "None"}
            </li>
            {patch2Options.length > 0 && (
              <li>
                Second Patch:{" "}
                {patch2Options.find((o) => o.key === patch2)?.label || "None"}
              </li>
            )}
            <li>
              Sleeve Ad:{" "}
              {sleeveOptions.find((o) => o.key === sleeveAd)?.label || "None"}
            </li>
            <li>
              Name & Number:{" "}
              {font
                ? `${(
                    font as string
                  ).toUpperCase()} — ${playerName.trim()} #${playerNumber.trim()}`
                : "None"}
            </li>
          </ul>
          {extraCents ? (
            <div className="mt-2 text-red-600 font-bold">
              Add-ons total: +{fmt(extraCents)}
            </div>
          ) : null}
        </div>
      )}

      <button type="submit" className="btn-primary w-full">
        Add to bag{" "}
        <span className="ml-1 text-sm opacity-90">
          ({fmt((product.priceCents || 0) + (extraCents || 0))})
        </span>
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
