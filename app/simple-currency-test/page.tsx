"use client";

import { useCurrency } from "@/components/providers/CurrencyProvider";
import { useEffect, useState, useCallback } from "react";

export default function SimpleCurrencyTest() {
  const { currentCurrency, convertPrice, formatPrice, setCurrency } =
    useCurrency();
  const [testResults, setTestResults] = useState<string[]>([]);

  const runTest = useCallback(() => {
    const results: string[] = [];
    const amount = 1000; // £10 GBP (base)

    results.push(`Current currency: ${currentCurrency}`);
    results.push(`Converting ${amount} GBP base cents...`);

    const converted = convertPrice(amount);
    results.push(`Converted: ${converted} cents`);

    const formatted = formatPrice(converted);
    results.push(`Formatted: ${formatted}`);

    // Test specific currencies
    const eurConverted = convertPrice(amount);
    results.push(
      `Formula (GBP→USD→EUR). usd = amount / GBP.rate; eur = usd * EUR.rate.`
    );
    results.push(`Our EUR conversion: ${eurConverted} cents`);

    setTestResults(results);
  }, [currentCurrency, convertPrice, formatPrice]);

  useEffect(() => {
    runTest();
  }, [currentCurrency, runTest]);

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Simple Currency Test</h1>

      <div className="space-y-4">
        <div>
          <p className="font-semibold mb-2">Quick Currency Switch:</p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrency("USD")}
              className={`px-3 py-1 rounded ${
                currentCurrency === "USD"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              USD
            </button>
            <button
              onClick={() => setCurrency("EUR")}
              className={`px-3 py-1 rounded ${
                currentCurrency === "EUR"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              EUR
            </button>
            <button
              onClick={() => setCurrency("GBP")}
              className={`px-3 py-1 rounded ${
                currentCurrency === "GBP"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              GBP
            </button>
          </div>
        </div>

        <div>
          <p className="font-semibold mb-2">Test Results:</p>
          <div className="bg-gray-100 p-4 rounded text-sm font-mono">
            {testResults.map((result, i) => (
              <div key={i}>{result}</div>
            ))}
          </div>
        </div>

        <div>
          <p className="font-semibold mb-2">Visual Test - $10, $25, $50:</p>
          <div className="space-y-2">
            {[1000, 2500, 5000].map((cents) => (
              <div
                key={cents}
                className="flex items-center gap-4 p-2 border rounded"
              >
                <span className="w-16">${(cents / 100).toFixed(2)}</span>
                <span>→</span>
                <span className="font-bold text-lg">
                  {formatPrice(convertPrice(cents))}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={runTest}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Refresh Test
        </button>
      </div>
    </div>
  );
}
