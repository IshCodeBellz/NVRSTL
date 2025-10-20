"use client";

import { Price } from "@/components/ui/Price";
import { useCurrency } from "@/components/providers/CurrencyProvider";

interface ClientPriceProps {
  cents: number;
  className?: string;
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
  variant?: "default" | "large" | "small" | "crossed";
}

export function ClientPrice({
  cents,
  className,
  size = "sm",
  variant = "default",
}: ClientPriceProps) {
  const { currentCurrency } = useCurrency();

  // Debug logging
  if (typeof window !== "undefined" && currentCurrency !== "USD") {
    console.log(`ClientPrice: Rendering ${cents} cents in ${currentCurrency}`);
  }

  return (
    <Price cents={cents} className={className} size={size} variant={variant} />
  );
}
