"use client";
import { useWishlist } from "@/components/providers/CartProvider";
import { lineIdFor, ProductSummary } from "@/lib/types";
import { useCallback, useState } from "react";

interface WishlistHeartProps {
  product: ProductSummary; // must include productId, name, priceCents, image, optional size
  className?: string;
  size?: number;
  announce?: boolean;
}

// Dispatch screen-reader announcement
function announce(msg: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("announce", { detail: msg }));
  }
}

export function WishlistHeart({
  product,
  className = "",
  size = 22,
  announce: shouldAnnounce = true,
}: WishlistHeartProps) {
  const { toggle, has, syncing } = useWishlist();
  const id = lineIdFor(product.productId, product.size);
  const active = has(id);
  const [pending, setPending] = useState(false);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (pending) return;
      setPending(true);
      toggle(product);
      if (shouldAnnounce) {
        announce(active ? "Removed from wishlist" : "Added to wishlist");
      }
      // small delay to re-enable to avoid rapid double toggles
      setTimeout(() => setPending(false), 250);
    },
    [active, product, toggle, pending, shouldAnnounce]
  );

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      disabled={pending || syncing}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-pink-400 disabled:opacity-50 ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="img"
        aria-hidden="true"
        className={`transition-colors ${
          active ? "fill-rose-500 stroke-rose-500" : "fill-none stroke-current"
        }`}
      >
        <path
          strokeWidth={2}
          d="M12 21s-1-.72-1-1.32S5 14.36 5 9.9C5 7.12 7.24 5 10 5c1.54 0 2.54.74 3 1.29.46-.55 1.46-1.29 3-1.29 2.76 0 5 2.12 5 4.9 0 4.46-6 9.78-6 9.78 0 .6-1 1.32-1 1.32z"
        />
      </svg>
      <span className="sr-only">
        {active ? "In wishlist" : "Not in wishlist"}
        {syncing ? ", syncing" : ""}
      </span>
    </button>
  );
}

export default WishlistHeart;
