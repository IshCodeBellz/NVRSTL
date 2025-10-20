"use client";
import { useState } from "react";
import { useWishlist, useCart } from "@/components/providers/CartProvider";
import { formatPriceCents } from "@/lib/money";

import Image from "next/image";
import Link from "next/link";

export default function SavedPage() {
  const { items, remove, moveToCart, clear } = useWishlist();
  const { addItem } = useCart();
  const [sortBy, setSortBy] = useState("newest");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Sort items
  const sortedItems = [...items].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return 0; // Fallback since addedAt may not exist
      case "price_low":
        return a.priceCents - b.priceCents;
      case "price_high":
        return b.priceCents - a.priceCents;
      case "name":
        return a.name.localeCompare(b.name);
      default: // newest
        return 0; // Fallback since addedAt may not exist
    }
  });

  const moveAllToBag = () => {
    items.forEach((item) => {
      moveToCart(item.id, addItem);
    });
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Saved items</h1>
          {items.length > 0 && (
            <p className="text-sm text-neutral-600 mt-1">
              {items.length} item{items.length !== 1 ? "s" : ""} saved
            </p>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-3">
            <Link
              href="/social/wishlists"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Create Social Wishlist
            </Link>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border rounded px-3 py-1 focus:outline-none focus:ring focus:ring-blue-300"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">No saved items yet</h2>
          <p className="text-neutral-600 mb-6">
            Start browsing and save items you love to see them here.
          </p>
          <Link
            href="/"
            className="bg-neutral-900 text-white px-6 py-2 rounded hover:bg-neutral-800"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <>
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6 p-4 bg-neutral-50 rounded-lg">
            <div className="text-sm text-neutral-600">
              {items.length} item{items.length !== 1 ? "s" : ""} in your
              wishlist
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={moveAllToBag}
                className="text-sm bg-neutral-900 text-white px-4 py-2 rounded hover:bg-neutral-800"
              >
                Move All to Bag
              </button>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-sm text-red-600 hover:text-red-500"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sortedItems.map((w) => (
              <div
                key={w.id}
                className="group relative bg-white border rounded-lg overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                <Link href={`/product/${w.id}`} className="block">
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={w.image}
                      alt={w.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                </Link>

                <div className="p-3 space-y-2 text-sm flex-1">
                  <Link href={`/product/${w.id}`} className="block">
                    <div className="font-medium line-clamp-2 leading-tight hover:text-blue-600">
                      {w.name}
                    </div>
                  </Link>

                  {w.size && (
                    <div className="text-xs text-neutral-500">
                      Size: {w.size}
                    </div>
                  )}

                  <div className="font-semibold">
                    {formatPriceCents(w.priceCents)}
                  </div>
                </div>

                <div className="p-3 pt-0 space-y-2">
                  <button
                    onClick={() => moveToCart(w.id, addItem)}
                    className="w-full bg-neutral-900 text-white py-2 rounded text-sm hover:bg-neutral-800 transition-colors"
                  >
                    Add to bag
                  </button>
                  <button
                    onClick={() => remove(w.id)}
                    className="w-full border border-neutral-300 py-2 rounded text-sm hover:bg-neutral-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>

                {/* Quick actions */}
                <button
                  onClick={() => remove(w.id)}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove from wishlist"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          <div className="mt-16 pt-8 border-t">
            <h2 className="text-lg font-semibold mb-4">You might also like</h2>
            <div className="text-sm text-neutral-600">
              <Link
                href="/new-in"
                className="text-blue-600 hover:text-blue-500"
              >
                Discover new arrivals
              </Link>{" "}
              based on your saved items
            </div>
          </div>
        </>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">
              Clear all saved items?
            </h3>
            <p className="text-sm text-neutral-600 mb-6">
              This will remove all {items.length} items from your wishlist. This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  clear();
                  setShowClearConfirm(false);
                }}
                className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 border rounded hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
