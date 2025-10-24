"use client";
import { useState } from "react";
import { useWishlist, useCart } from "@/components/providers/CartProvider";
import { ClientPrice } from "@/components/ui/ClientPrice";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2, Plus, X } from "lucide-react";

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
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                Saved Items
              </h1>
              {items.length > 0 && (
                <p className="text-sm text-neutral-600 mt-1">
                  {items.length} item{items.length !== 1 ? "s" : ""} saved
                </p>
              )}
            </div>

            {items.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Link
                  href="/social/wishlists"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Create Social Wishlist
                </Link>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-sm border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-400 bg-white"
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
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Heart className="w-10 h-10 text-neutral-400" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-3">
              No saved items yet
            </h2>
            <p className="text-neutral-600 mb-8 max-w-md mx-auto">
              Start browsing and save items you love to see them here.
            </p>
            <Link
              href="/drops"
              className="inline-flex items-center gap-2 bg-neutral-900 text-white px-6 py-3 rounded-lg hover:bg-neutral-800 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 p-6 bg-white rounded-lg shadow-sm">
              <div className="text-sm text-neutral-600">
                {items.length} item{items.length !== 1 ? "s" : ""} in your
                wishlist
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={moveAllToBag}
                  className="inline-flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Move All to Bag
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center gap-2 text-red-600 hover:text-red-500 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
              </div>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {sortedItems.map((w) => (
                <div
                  key={w.id}
                  className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
                >
                  <Link href={`/product/${w.id}`} className="block">
                    <div className="relative aspect-[3/4] bg-neutral-100">
                      <Image
                        src={w.image}
                        alt={w.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                      />
                    </div>
                  </Link>

                  <div className="p-4 flex-1 flex flex-col">
                    <Link href={`/product/${w.id}`} className="block flex-1">
                      <h3 className="font-medium text-sm text-neutral-900 line-clamp-2 leading-tight hover:text-neutral-600 transition-colors">
                        {w.name}
                      </h3>
                    </Link>

                    {w.size && (
                      <p className="text-xs text-neutral-500 mt-1">
                        Size: {w.size}
                      </p>
                    )}

                    <div className="mt-2">
                      <ClientPrice
                        cents={w.priceCents}
                        className="text-sm font-semibold text-neutral-900"
                      />
                    </div>
                  </div>

                  <div className="p-4 pt-0 space-y-2">
                    <button
                      onClick={() => moveToCart(w.id, addItem)}
                      className="w-full bg-neutral-900 text-white py-2 rounded-lg text-sm hover:bg-neutral-800 transition-colors font-medium"
                    >
                      Add to bag
                    </button>
                    <button
                      onClick={() => remove(w.id)}
                      className="w-full border border-neutral-300 text-neutral-700 py-2 rounded-lg text-sm hover:bg-neutral-50 transition-colors font-medium"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Quick actions */}
                  <button
                    onClick={() => remove(w.id)}
                    className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove from wishlist"
                  >
                    <X className="w-4 h-4 text-neutral-600" />
                  </button>
                </div>
              ))}
            </div>

            {/* Suggestions */}
            <div className="mt-16 pt-8 border-t border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">
                You might also like
              </h2>
              <div className="text-sm text-neutral-600">
                <Link
                  href="/drops"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Discover new arrivals
                </Link>{" "}
                based on your saved items
              </div>
            </div>
          </>
        )}
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-neutral-900 mb-2">
              Clear all saved items?
            </h3>
            <p className="text-sm text-neutral-600 mb-6">
              This will remove all {items.length} items from your wishlist. This
              action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  clear();
                  setShowClearConfirm(false);
                }}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors font-medium"
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
