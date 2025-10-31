"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useCart, useWishlist } from "@/components/providers/CartProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ClientPrice } from "@/components/ui/ClientPrice";
import { lineIdFor } from "@/lib/types";

interface Product {
  id: string;
  name: string;
  priceCents: number;
  image: string;
  images?: { url: string }[];
  brand?: { name: string };
  category?: { name: string };
  sizes?: string[];
}

interface InteractiveProductCardProps {
  product: Product;
  variant?: "square" | "portrait";
  showBrand?: boolean;
  showCategory?: boolean;
  showRanking?: boolean;
  ranking?: number;
  showActions?: boolean;
  className?: string;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
}

export function InteractiveProductCard({
  product,
  variant = "portrait",
  showBrand = false,
  showCategory = false,
  showRanking = false,
  ranking,
  showActions = true,
  className = "",
  onAddToCart,
  onToggleWishlist,
}: InteractiveProductCardProps) {
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();
  const { push } = useToast();

  const id = lineIdFor(product.id);
  const inWish = has(id);
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;

  const handleAddToCart = (selectedSize?: string) => {
    if (onAddToCart) {
      onAddToCart(product);
    } else {
      addItem({
        productId: product.id,
        name: product.name,
        priceCents: product.priceCents,
        image: product.image,
        size: selectedSize || product.sizes?.[0] || "One Size",
      });
      push({
        type: "success",
        message: selectedSize ? `Added ${selectedSize}` : "Added to bag",
      });
    }
  };

  const handleToggleWishlist = () => {
    if (onToggleWishlist) {
      onToggleWishlist(product);
    } else {
      const already = inWish;
      toggle({
        productId: product.id,
        name: product.name,
        priceCents: product.priceCents,
        image: product.image,
      });
      push({
        type: already ? "info" : "success",
        message: already ? "Removed from saved" : "Saved",
      });
    }
  };

  const aspectClass = variant === "square" ? "aspect-square" : "aspect-[3/4]";

  return (
    <div
      className={`group relative bg-gray-800 overflow-hidden rounded-lg border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:shadow-gray-900/50 flex flex-col ${className}`}
    >
      {/* Product Image */}
      <div className={`${aspectClass} relative`}>
        <Link href={`/product/${product.id}`} className="absolute inset-0">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width:768px) 50vw, (max-width:1200px) 20vw, 15vw"
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </Link>

        {/* Ranking Badge */}
        {showRanking && ranking && (
          <div className="absolute top-3 left-3 z-10 text-xs font-bold bg-white text-black px-3 py-1.5 rounded-full shadow-lg font-carbon">
            #{ranking}
          </div>
        )}

        {/* Action Buttons - Drops Style */}
        {showActions && (
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
            {/* Wishlist Button */}
            <button
              onClick={handleToggleWishlist}
              className={`rounded-full h-9 w-9 text-sm font-bold flex items-center justify-center backdrop-blur bg-white/90 border shadow-lg transition-all duration-200 hover:scale-110 ${
                inWish
                  ? "border-red-500 text-red-500"
                  : "border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-400"
              }`}
            >
              {inWish ? "♥" : "♡"}
            </button>

            {/* Add to Cart Button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (hasSizes) {
                    // Open size chooser popover (toggle) instead of immediate add
                    const host = (e.currentTarget
                      .parentElement as HTMLElement)!.querySelector<HTMLElement>(
                      "[data-size-popover]"
                    );
                    if (host) host.toggleAttribute("data-open");
                    return;
                  }
                  handleAddToCart();
                }}
                className="rounded-full h-9 w-9 text-lg leading-none font-bold flex items-center justify-center backdrop-blur bg-white/90 border border-gray-300 text-gray-600 shadow-lg transition-all duration-200 hover:scale-110 hover:border-green-500 hover:text-green-600"
                aria-label={hasSizes ? "Choose size" : "Add to bag"}
              >
                +
              </button>

              {/* Size Selection Popover */}
              {hasSizes && (
                <div
                  data-size-popover
                  className="absolute top-9 right-0 z-30 hidden data-[open]:flex flex-col gap-2 bg-neutral-900/95 shadow-xl border border-neutral-700 rounded-md p-3 min-w-[140px]"
                >
                  <div className="text-[10px] font-carbon font-bold uppercase tracking-widest text-white/70 pb-2 border-b border-white/10">
                    Select size
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes?.map((s: string) => (
                      <button
                        key={s}
                        onClick={() => {
                          handleAddToCart(s);
                          const host =
                            (document.querySelector(
                              `[data-size-popover][data-open]`
                            ) as HTMLElement) || null;
                          host?.removeAttribute("data-open");
                        }}
                        className="px-2.5 py-1.5 text-[11px] rounded border border-white/20 text-white/90 hover:bg-white/10 active:bg-white/15"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const host =
                        (document.querySelector(
                          `[data-size-popover][data-open]`
                        ) as HTMLElement) || null;
                      host?.removeAttribute("data-open");
                    }}
                    className="mt-1.5 text-[11px] text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product Info - Now underneath the image */}
      <div className="p-4 bg-gray-800">
        <div className="font-bold text-white text-sm truncate font-carbon uppercase tracking-wide mb-2">
          {product.name}
        </div>

        {/* Brand */}
        {showBrand && product.brand?.name && (
          <p className="text-xs text-gray-400 mb-2 font-carbon uppercase tracking-wider">
            {product.brand.name}
          </p>
        )}

        {/* Category */}
        {showCategory && product.category?.name && (
          <p className="text-xs text-gray-400 mb-2 font-carbon uppercase tracking-wider">
            {product.category.name}
          </p>
        )}

        {/* Price */}
        <div className="text-white">
          <ClientPrice
            cents={product.priceCents}
            size="sm"
            className="text-white font-bold font-carbon"
          />
        </div>
      </div>
    </div>
  );
}
