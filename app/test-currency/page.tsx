"use client";

import { useCurrency } from "@/components/providers/CurrencyProvider";
import { CurrencySelector } from "@/components/ui/CurrencySelector";
import { useEffect, useState } from "react";
import { currencyService, SUPPORTED_CURRENCIES } from "@/lib/currency";

export default function TestCurrencyPage() {
  const { currentCurrency, convertPrice, formatPrice, currencies, isLoading } =
    useCurrency();
  const [renderCount, setRenderCount] = useState(0);

  const testAmount = 1000; // £10.00 GBP (base currency)

  useEffect(() => {
    setRenderCount((prev) => prev + 1);
  }, []);

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Currency Conversion Test</h1>

      <div className="space-y-6">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold text-yellow-800">Debug Info</h3>
          <p>Render count: {renderCount}</p>
          <p>Is loading: {String(isLoading)}</p>
          <p>Available currencies: {currencies.length}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">
            Current Currency Settings
          </h2>
          <p>
            Current Currency: <strong>{currentCurrency}</strong>
          </p>
          <div className="mt-4">
            <CurrencySelector />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Test Conversion</h2>
          <p>Original Amount (base): £10.00 GBP ({testAmount} base cents)</p>
          <p>
            Converted Amount in {currentCurrency}: {convertPrice(testAmount)}{" "}
            cents
          </p>
          <p>
            Formatted Price:{" "}
            <strong>{formatPrice(convertPrice(testAmount))}</strong>
          </p>

          <div className="mt-4 p-3 bg-gray-100 rounded">
            <h4 className="font-medium">Step by step:</h4>
            <p>
              1. convertPrice({testAmount}) = {convertPrice(testAmount)}
            </p>
            <p>
              2. formatPrice({convertPrice(testAmount)}) ={" "}
              {formatPrice(convertPrice(testAmount))}
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Currency Rates Check</h2>
          {currencies.slice(0, 5).map((currency) => (
            <div
              key={currency.code}
              className="flex items-center gap-4 p-2 border rounded"
            >
              <span className="w-16">{currency.code}</span>
              <span className="w-8">{currency.symbol}</span>
              <span className="w-16">Rate: {currency.rate}</span>
              <span>
                £10 GBP = {formatPrice(convertPrice(1000), currency.code)}
              </span>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Multiple Test Amounts</h2>
          {[500, 1000, 2000, 5000].map((amount) => (
            <div
              key={amount}
              className="flex items-center gap-4 p-2 border rounded"
            >
              <span className="w-20">£{(amount / 100).toFixed(2)}</span>
              <span>→</span>
              <span className="w-32">{convertPrice(amount)} cents</span>
              <span>→</span>
              <span className="font-semibold">
                {formatPrice(convertPrice(amount))}
              </span>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">
            Manual Calculation Test
          </h2>
          <div className="space-y-2 text-sm">
            <p>
              Base: GBP. Static table rates are USD→Currency. GBP rate ={" "}
              {currencies.find((c) => c.code === "GBP")?.rate} (GBP per USD).
            </p>
            <p>To convert £10 GBP → EUR:</p>
            <p>1. GBP→USD: usd = 10 / GBP.rate</p>
            <p>2. USD→EUR: eur = usd * EUR.rate</p>
            <p>Result: {formatPrice(convertPrice(1000), "EUR")}</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Direct Service Test</h2>
          <button
            onClick={() => {
              console.log("=== Currency Debug ===");
              console.log("Current currency:", currentCurrency);
              console.log("Is loading:", isLoading);
              console.log(
                "Available currencies:",
                currencies.map((c) => c.code)
              );

              // Test direct service calls
              // Using imported currencyService and SUPPORTED_CURRENCIES
              console.log(
                "Supported currencies:",
                Object.keys(SUPPORTED_CURRENCIES)
              );
              console.log("EUR currency object:", SUPPORTED_CURRENCIES.EUR);
              console.log(
                "1000 GBP cents to EUR:",
                currencyService.convertPrice(1000, "EUR")
              );
              console.log(
                "920 EUR cents formatted as EUR:",
                currencyService.formatPrice(920, "EUR")
              );
              console.log(
                "1000 GBP cents to GBP:",
                currencyService.convertPrice(1000, "GBP")
              );
              console.log(
                "1000 GBP cents formatted as GBP:",
                currencyService.formatPrice(1000, "GBP")
              );

              // Test context functions
              console.log(
                "Context convertPrice(1000 GBP cents):",
                convertPrice(1000)
              );
              console.log(
                "Context formatPrice(1000 GBP cents):",
                formatPrice(1000)
              );
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Run Console Tests
          </button>
        </div>
      </div>
    </div>
  );
}
