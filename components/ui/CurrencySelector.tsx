"use client";

import { useState, useEffect, useRef } from "react";
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentCurrencyData = currencies.find(
    (c) => c.code === currentCurrency
  );

  // Handle click outside and escape key to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2",
    lg: "text-base px-4 py-3",
  };

  if (variant === "minimal") {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg transition-colors ${sizeClasses[size]} text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800`}
          disabled={isLoading}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <Globe className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
          <span className="font-semibold text-neutral-900 dark:text-white">
            {currentCurrencyData?.symbol || "$"}
          </span>
          <ChevronDown
            className={`w-3 h-3 text-neutral-600 dark:text-neutral-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full right-0 mt-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-[9999] min-w-[200px] max-h-[300px] overflow-y-auto">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => {
                    setCurrency(currency.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-100 dark:border-neutral-600 last:border-b-0 ${
                    currency.code === currentCurrency
                      ? "bg-blue-50 dark:bg-blue-900/20 font-medium"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-neutral-900 dark:text-white">
                        <span className="font-semibold">{currency.symbol}</span>{" "}
                        {currency.code}
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
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:border-neutral-400 dark:hover:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors ${sizeClasses[size]} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white`}
          disabled={isLoading}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <Globe className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
          {showLabel && <span>Currency:</span>}
          <span className="font-medium">
            <span className="font-semibold">{currentCurrencyData?.symbol}</span>{" "}
            {currentCurrency}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-neutral-600 dark:text-neutral-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-[9999] min-w-full max-h-[300px] overflow-y-auto">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => {
                    setCurrency(currency.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-100 dark:border-neutral-600 last:border-b-0 ${
                    currency.code === currentCurrency
                      ? "bg-blue-50 dark:bg-blue-900/20 font-medium"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-neutral-900 dark:text-white">
                        <span className="font-semibold">{currency.symbol}</span>{" "}
                        {currency.code}
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
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        {showLabel && "Currency"}
      </label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between border border-neutral-300 dark:border-neutral-600 rounded-lg hover:border-neutral-400 dark:hover:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors ${sizeClasses[size]} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white`}
          disabled={isLoading}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            <span className="font-medium">
              <span className="font-semibold">
                {currentCurrencyData?.symbol}
              </span>{" "}
              {currentCurrency}
            </span>
            <span className="text-neutral-500 dark:text-neutral-400 text-sm">
              {currentCurrencyData?.name}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-neutral-600 dark:text-neutral-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-[9999] w-full max-h-[300px] overflow-y-auto">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => {
                    setCurrency(currency.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-100 dark:border-neutral-600 last:border-b-0 ${
                    currency.code === currentCurrency
                      ? "bg-blue-50 dark:bg-blue-900/20 font-medium"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-neutral-900 dark:text-white">
                        <span className="font-semibold">{currency.symbol}</span>{" "}
                        {currency.code}
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
    </div>
  );
}
