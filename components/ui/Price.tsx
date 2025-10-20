"use client";

import { useCurrency } from "@/components/providers/CurrencyProvider";
import { Loader2 } from "lucide-react";

interface PriceProps {
  /** Price in base currency cents (GBP) */
  cents: number;
  /** Compare price in base currency cents (GBP) */
  compareCents?: number;
  /** Additional CSS classes */
  className?: string;
  /** Show currency code alongside symbol */
  showCurrencyCode?: boolean;
  /** Text size variant */
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
  /** Price styling variant */
  variant?: "default" | "large" | "small" | "crossed";
  /** Show loading state */
  showLoader?: boolean;
}

export function Price({
  cents,
  compareCents,
  className = "",
  showCurrencyCode = false,
  size = "base",
  variant = "default",
  showLoader = false,
}: PriceProps) {
  const { convertPrice, formatPrice, isLoading, currentCurrency } =
    useCurrency();

  // Convert prices to current currency
  const convertedPrice = convertPrice(cents);
  const convertedComparePrice = compareCents
    ? convertPrice(compareCents)
    : undefined;

  // Format prices
  const formattedPrice = formatPrice(convertedPrice);
  const formattedComparePrice = convertedComparePrice
    ? formatPrice(convertedComparePrice)
    : undefined;

  // Size classes
  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
  };

  // Variant classes
  const variantClasses = {
    default: "font-medium text-neutral-900 dark:text-white",
    large: "font-bold text-neutral-900 dark:text-white",
    small: "text-neutral-600 dark:text-neutral-400",
    crossed: "line-through text-neutral-500 dark:text-neutral-400",
  };

  const baseClassName =
    `${sizeClasses[size]} ${variantClasses[variant]} ${className}`
      .replace(/text-neutral-\d+|text-white|dark:text-\w+/g, "")
      .trim();
  const finalClassName =
    className &&
    (className.includes("text-white") || className.includes("text-"))
      ? `${sizeClasses[size]} ${className}`
      : `${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  if (isLoading && showLoader) {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className={baseClassName}>Loading...</span>
      </div>
    );
  }

  // Show discount pricing
  if (
    compareCents &&
    convertedComparePrice &&
    convertedComparePrice > convertedPrice
  ) {
    const discountPercent = Math.round(
      ((convertedComparePrice - convertedPrice) / convertedComparePrice) * 100
    );

    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className={finalClassName}>
          {formattedPrice}
          {showCurrencyCode && (
            <span className="text-xs ml-1 opacity-70">{currentCurrency}</span>
          )}
        </span>
        <span
          className={`${sizeClasses[size]} line-through text-neutral-500 dark:text-neutral-400`}
        >
          {formattedComparePrice}
        </span>
        <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5 rounded-full font-medium">
          -{discountPercent}%
        </span>
      </div>
    );
  }

  // Regular price
  return (
    <span className={finalClassName}>
      {formattedPrice}
      {showCurrencyCode && (
        <span className="text-xs ml-1 opacity-70">{currentCurrency}</span>
      )}
    </span>
  );
}

// Convenience components for common use cases
export function ProductPrice({
  cents,
  compareCents,
  className = "",
}: Omit<PriceProps, "size" | "variant">) {
  return (
    <Price
      cents={cents}
      compareCents={compareCents}
      size="lg"
      variant="large"
      className={className}
    />
  );
}

export function SmallPrice({
  cents,
  className = "",
}: Omit<PriceProps, "size" | "variant">) {
  return (
    <Price cents={cents} size="sm" variant="small" className={className} />
  );
}

export function CartPrice({
  cents,
  className = "",
}: Omit<PriceProps, "size" | "variant">) {
  return (
    <Price cents={cents} size="base" variant="default" className={className} />
  );
}
