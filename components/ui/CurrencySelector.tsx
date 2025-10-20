"use client";

import { useState } from "react";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { ChevronDown, Globe } from "lucide-react";

interface CurrencySelectorProps {
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "dropdown" | "button" | "minimal";
}

export function CurrencySelector({
  showLabel = true,
  size = "md",
  variant = "dropdown",
}: CurrencySelectorProps) {
  const { currentCurrency, currencies, setCurrency, isLoading } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  const currentCurrencyData = currencies.find(
    (c) => c.code === currentCurrency
  );

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2",
    lg: "text-base px-4 py-3",
  };

  if (variant === "minimal") {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors ${sizeClasses[size]} text-neutral-700 dark:text-neutral-300`}
          disabled={isLoading}
        >
          <Globe className="w-4 h-4" />
          <span className="font-medium">
            {currentCurrencyData?.symbol || "$"}
          </span>
          <ChevronDown
            className={`w-3 h-3 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20 min-w-[200px] max-h-[300px] overflow-y-auto">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => {
                    setCurrency(currency.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-100 dark:border-neutral-600 last:border-b-0 ${
                    currency.code === currentCurrency
                      ? "bg-neutral-50 dark:bg-neutral-700 font-medium"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-neutral-900 dark:text-white">
                        {currency.symbol} {currency.code}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {currency.name}
                      </div>
                    </div>
                    {currency.code === currentCurrency && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (variant === "button") {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors ${sizeClasses[size]} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white`}
          disabled={isLoading}
        >
          <Globe className="w-4 h-4" />
          {showLabel && <span>Currency:</span>}
          <span className="font-medium">
            {currentCurrencyData?.symbol} {currentCurrency}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20 min-w-full max-h-[300px] overflow-y-auto">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => {
                    setCurrency(currency.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-100 dark:border-neutral-600 last:border-b-0 ${
                    currency.code === currentCurrency
                      ? "bg-neutral-50 dark:bg-neutral-700 font-medium"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-neutral-900 dark:text-white">
                        {currency.symbol} {currency.code}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {currency.name}
                      </div>
                    </div>
                    {currency.code === currentCurrency && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        {showLabel && "Currency"}
      </label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between border border-neutral-300 dark:border-neutral-600 rounded-lg hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors ${sizeClasses[size]} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white`}
          disabled={isLoading}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="font-medium">
              {currentCurrencyData?.symbol} {currentCurrency}
            </span>
            <span className="text-neutral-500 dark:text-neutral-400 text-sm">
              {currentCurrencyData?.name}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20 w-full max-h-[300px] overflow-y-auto">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => {
                    setCurrency(currency.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-100 dark:border-neutral-600 last:border-b-0 ${
                    currency.code === currentCurrency
                      ? "bg-neutral-50 dark:bg-neutral-700 font-medium"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {currency.symbol}
                      </span>
                      <span className="text-sm text-neutral-900 dark:text-white">
                        {currency.code}
                      </span>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {currency.name}
                      </span>
                    </div>
                    {currency.code === currentCurrency && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
