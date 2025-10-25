"use client";

import Link from "next/link";
import Image from "next/image";
import { ClientPrice } from "@/components/ui/ClientPrice";

interface Product {
  id: string;
  name: string;
  priceCents: number;
  image: string;
  images?: { url: string; alt?: string | null }[];
  brand?: { name: string } | null;
  category?: { name: string };
}

interface ProductCardProps {
  product: Product;
  variant?: "square" | "portrait";
  theme?: "dark" | "light";
  showBrand?: boolean;
  showCategory?: boolean;
  className?: string;
  onClick?: () => void;
}

export function ProductCard({
  product,
  variant = "square",
  theme = "dark",
  showBrand = false,
  showCategory = false,
  className = "",
  onClick,
}: ProductCardProps) {
  const aspectClass = variant === "square" ? "aspect-square" : "aspect-[3/4]";

  // Theme-based styling
  const themeClasses = {
    dark: {
      container:
        "bg-gray-800 border-gray-700 hover:border-gray-600 hover:shadow-2xl hover:shadow-gray-900/50",
      imageBg: "bg-gray-700",
      textPrimary: "text-white",
      textSecondary: "text-gray-400",
      noImageText: "text-gray-400",
    },
    light: {
      container:
        "bg-white border-gray-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-300",
      imageBg: "bg-gray-100",
      textPrimary: "text-gray-900",
      textSecondary: "text-gray-600",
      noImageText: "text-gray-400",
    },
  };

  const currentTheme = themeClasses[theme];
  const imageSrc =
    product.image || product.images?.[0]?.url || "/placeholder.svg";
  const imageAlt = product.images?.[0]?.alt || product.name;

  const cardContent = (
    <div
      className={`group overflow-hidden rounded-lg border transition-all duration-300 ${currentTheme.container} ${className}`}
      onClick={onClick}
    >
      {/* Product Image */}
      <div
        className={`${aspectClass} ${currentTheme.imageBg} relative overflow-hidden`}
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="(max-width:768px) 50vw, (max-width:1200px) 25vw, 20vw"
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className={`${currentTheme.noImageText} font-carbon`}>
              No Image
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3
          className={`font-bold line-clamp-2 mb-2 font-carbon uppercase tracking-wide text-sm ${currentTheme.textPrimary}`}
        >
          {product.name || "NO NAME"}
        </h3>

        {/* Brand */}
        {showBrand && product.brand?.name && (
          <p
            className={`text-xs mb-3 font-carbon uppercase tracking-wider ${currentTheme.textSecondary}`}
          >
            {product.brand.name}
          </p>
        )}

        {/* Category */}
        {showCategory && product.category?.name && (
          <p
            className={`text-xs mb-3 font-carbon uppercase tracking-wider ${currentTheme.textSecondary}`}
          >
            {product.category.name}
          </p>
        )}

        {/* Price */}
        <div className={`text-sm font-bold ${currentTheme.textPrimary}`}>
          <ClientPrice cents={product.priceCents || 0} />
        </div>
      </div>
    </div>
  );

  // If onClick is provided, render as div, otherwise as Link
  if (onClick) {
    return cardContent;
  }

  return (
    <Link href={`/product/${product.id}`} className="block">
      {cardContent}
    </Link>
  );
}
