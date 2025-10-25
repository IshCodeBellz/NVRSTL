"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/providers/CartProvider";
import { ClientPrice } from "@/components/ui/ClientPrice";
import { X } from "lucide-react";

interface SavedItem {
  id: string;
  name: string;
  priceCents: number;
  image: string;
  size?: string;
}

interface SavedProductCardProps {
  item: SavedItem;
  onRemove: (id: string) => void;
  onMoveToCart: (id: string, addItem: any) => void;
  addItem: any;
}

export function SavedProductCard({
  item,
  onRemove,
  onMoveToCart,
  addItem,
}: SavedProductCardProps) {
  return (
    <div className="group relative bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col border border-gray-700">
      <Link href={`/product/${item.id}`} className="block">
        <div className="relative aspect-[3/4] bg-gray-700">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
          />
        </div>
      </Link>

      <div className="p-4 flex-1 flex flex-col">
        <Link href={`/product/${item.id}`} className="block flex-1">
          <h3 className="font-medium text-sm text-white line-clamp-2 leading-tight hover:text-gray-300 transition-colors font-carbon">
            {item.name}
          </h3>
        </Link>

        {item.size && (
          <p className="text-xs text-gray-400 mt-1">Size: {item.size}</p>
        )}

        <div className="mt-2">
          <ClientPrice
            cents={item.priceCents}
            className="text-sm font-semibold text-white"
          />
        </div>
      </div>

      <div className="p-4 pt-0 space-y-2">
        <button
          onClick={() => onMoveToCart(item.id, addItem)}
          className="w-full bg-white text-black py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors font-medium font-carbon uppercase tracking-wider"
        >
          Add to bag
        </button>
        <button
          onClick={() => onRemove(item.id)}
          className="w-full border border-gray-600 text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors font-medium"
        >
          Remove
        </button>
      </div>

      {/* Quick actions */}
      <button
        onClick={() => onRemove(item.id)}
        className="absolute top-2 right-2 w-8 h-8 bg-gray-800/90 hover:bg-gray-800 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-gray-600"
        aria-label="Remove from wishlist"
      >
        <X className="w-4 h-4 text-gray-300" />
      </button>
    </div>
  );
}
