"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { useWishlist, useCart } from "@/components/providers/CartProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ClientPrice } from "@/components/ui/ClientPrice";
import { lineIdFor } from "@/lib/types";

interface Product {
  id: string;
  name: string;
  priceCents: number;
  price?: number;
  image?: string;
  imageUrl?: string;
  images?: Array<{ url: string; alt?: string }>;
  brand?: { name: string };
  sizes?: Array<{ label: string; stock: number }>;
}

interface CategoryProductCardProps {
  product: Product;
  viewedRef: React.MutableRefObject<Set<string>>;
  onView?: (productId: string) => void;
  onWishlist?: (productId: string, action: "WISHLIST" | "UNWISHLIST") => void;
}

export function CategoryProductCard({
  product,
  viewedRef,
  onView,
  onWishlist,
}: CategoryProductCardProps) {
  const { toggle, has } = useWishlist();
  const { addItem } = useCart();
  const { push } = useToast();

  const id = lineIdFor(product.id);
  const inWish = has(id);
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
  const imageSrc =
    product.image ||
    product.imageUrl ||
    product.images?.[0]?.url ||
    "/placeholder.png";

  return (
    <div
      key={product.id}
      className="group relative bg-neutral-100 aspect-[3/4] overflow-hidden rounded flex flex-col"
      ref={(el) => {
        if (!el) return;
        if (viewedRef.current.has(product.id)) return;
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                viewedRef.current.add(product.id);
                onView?.(product.id);
                try {
                  navigator.sendBeacon?.(
                    "/api/events",
                    new Blob(
                      [
                        JSON.stringify([
                          { productId: product.id, type: "VIEW" },
                        ]),
                      ],
                      { type: "application/json" }
                    )
                  );
                } catch {}
                io.disconnect();
              }
            });
          },
          { threshold: 0.4 }
        );
        io.observe(el);
      }}
    >
      {/* Full-card clickable layer (beneath controls) */}
      <Link
        href={`/product/${product.id}`}
        className="absolute inset-0 z-[1]"
        aria-label={`View ${product.name}`}
      >
        <Image
          src={imageSrc}
          alt={product.name}
          width={300}
          height={300}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform"
        />
      </Link>

      {/* Action buttons stack above link */}
      <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
        <button
          onClick={() => {
            const already = inWish;
            toggle({
              productId: product.id,
              name: product.name,
              priceCents: product.priceCents,
              image: product.image || product.imageUrl || "",
            });
            onWishlist?.(product.id, already ? "UNWISHLIST" : "WISHLIST");
            try {
              navigator.sendBeacon?.(
                "/api/events",
                new Blob(
                  [
                    JSON.stringify([
                      {
                        productId: product.id,
                        type: already ? "UNWISHLIST" : "WISHLIST",
                      },
                    ]),
                  ],
                  { type: "application/json" }
                )
              );
            } catch {}
            push({
              type: already ? "info" : "success",
              message: already ? "Removed from saved" : "Saved",
            });
          }}
          className={`rounded-full h-8 w-8 text-[11px] font-semibold flex items-center justify-center backdrop-blur bg-white/80 border ${
            inWish ? "border-neutral-900" : "border-transparent"
          }`}
        >
          {inWish ? "♥" : "♡"}
        </button>
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
              addItem(
                {
                  productId: product.id,
                  name: product.name,
                  priceCents: product.priceCents,
                  image: product.image || product.imageUrl || "",
                },
                1
              );
              push({ type: "success", message: "Added to bag" });
            }}
            className="rounded-full h-8 w-8 text-[11px] font-semibold flex items-center justify-center backdrop-blur bg-white/80 border border-transparent hover:border-neutral-900"
            aria-label={hasSizes ? "Choose size" : "Add to bag"}
          >
            +
          </button>
          {hasSizes && (
            <div
              data-size-popover
              className="absolute top-8 right-0 z-30 hidden data-[open]:flex flex-col gap-1 bg-white shadow-lg border border-neutral-200 rounded p-2 min-w-[120px]"
            >
              <div className="text-[10px] uppercase tracking-wide font-semibold text-neutral-500 pb-1 border-b mb-1">
                Select size
              </div>
              <div className="flex flex-wrap gap-1">
                {product.sizes?.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => {
                      addItem(
                        {
                          productId: product.id,
                          name: product.name,
                          priceCents: product.priceCents,
                          image: product.image || product.imageUrl || "",
                          size: s.label,
                        },
                        1
                      );
                      push({
                        type: "success",
                        message: `Added ${s.label}`,
                      });
                      const host =
                        (document.querySelector(
                          `[data-size-popover][data-open]`
                        ) as HTMLElement) || null;
                      host?.removeAttribute("data-open");
                    }}
                    className="px-2 py-1 text-[11px] rounded border border-neutral-300 hover:bg-neutral-100 active:bg-neutral-200"
                  >
                    {s.label}
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
                className="mt-2 text-[10px] text-neutral-500 hover:text-neutral-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Product info overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-neutral-900/95 via-neutral-900/60 to-transparent text-white">
        <div className="font-medium text-sm truncate mb-1">{product.name}</div>
        <div className="text-xs text-neutral-300">
          <ClientPrice cents={product.priceCents} size="xs" />
        </div>
      </div>
    </div>
  );
}
