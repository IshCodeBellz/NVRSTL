import {
  currencyService,
  SUPPORTED_CURRENCIES,
  BASE_CURRENCY,
} from "@/lib/currency";

/**
 * These tests assert the new GBP base currency semantics:
 * - convertPrice returns identity for GBP -> GBP
 * - convertPrice for GBP -> EUR follows: (gbp / GBP.rate) * EUR.rate
 */

describe("Currency Conversion (GBP base)", () => {
  test("GBP -> GBP identity", () => {
    const amount = 12345; // £123.45
    const converted = currencyService.convertPrice(amount, BASE_CURRENCY);
    expect(converted).toBe(amount);
  });

  test("GBP -> EUR indirect via USD", () => {
    const amount = 10000; // £100.00
    const gbpRate = SUPPORTED_CURRENCIES.GBP.rate; // GBP per USD
    const eurRate = SUPPORTED_CURRENCIES.EUR.rate; // EUR per USD

    // expected cents: ((gbp/100)/gbpRate)*eurRate *100  -> simplify: amount * eurRate / gbpRate
    const expected = Math.round(amount * (eurRate / gbpRate));
    const actual = currencyService.convertPrice(amount, "EUR");
    expect(actual).toBe(expected);
  });
});
