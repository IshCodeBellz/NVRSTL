import { currencyService } from "./currency";

export function formatPriceCents(
  cents: number,
  options: { currency?: string; locale?: string } = {}
) {
  const { currency = "GBP", locale = "en-GB" } = options;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "JPY" || currency === "KRW" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" || currency === "KRW" ? 0 : 2,
  }).format(cents / 100);
}

// Convert stored GBP cents to target currency cents.
export function convertPriceCents(
  gbpCents: number,
  targetCurrency: string
): number {
  return currencyService.convertPrice(gbpCents, targetCurrency);
}

// Format a stored GBP price into a different currency (or same) with locale.
export function formatPriceWithCurrency(
  gbpCents: number,
  targetCurrency: string,
  locale?: string
): string {
  const convertedCents = convertPriceCents(gbpCents, targetCurrency);
  return formatPriceCents(convertedCents, { currency: targetCurrency, locale });
}
