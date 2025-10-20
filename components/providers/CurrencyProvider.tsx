"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  currencyService,
  Currency,
  SUPPORTED_CURRENCIES,
} from "@/lib/currency";

interface CurrencyContextType {
  currentCurrency: string;
  currencies: Currency[];
  isLoading: boolean;
  setCurrency: (currencyCode: string) => void;
  convertPrice: (gbpCents: number) => number;
  formatPrice: (cents: number, targetCurrency?: string) => string;
  autoDetectCurrency: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currentCurrency, setCurrentCurrency] = useState<string>("GBP");
  const [isLoading, setIsLoading] = useState(true);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);

  const currencies = Object.values(SUPPORTED_CURRENCIES);

  // Load saved currency preference on mount
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        // Check localStorage first
        const saved = localStorage.getItem("preferred-currency");
        if (saved && SUPPORTED_CURRENCIES[saved]) {
          setCurrentCurrency(saved);
          setIsLoading(false);
          return;
        }

        // Auto-detect if no preference saved
        if (!hasAutoDetected) {
          await autoDetectCurrency();
          setHasAutoDetected(true);
        }
      } catch (error) {
      
        console.warn("Failed to load currency preference:", error);
        setCurrentCurrency("GBP");
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrency();
  }, [hasAutoDetected]);

  const setCurrency = (currencyCode: string) => {
    if (SUPPORTED_CURRENCIES[currencyCode]) {
      console.log(
        `Currency changing from ${currentCurrency} to ${currencyCode}`
      );
      setCurrentCurrency(currencyCode);
      localStorage.setItem("preferred-currency", currencyCode);
    } else {
      console.warn(`Attempted to set unsupported currency: ${currencyCode}`);
    }
  };

  const autoDetectCurrency = async () => {
    try {
      setIsLoading(true);
      const detectedCurrency = await currencyService.detectUserCurrency();
      setCurrentCurrency(detectedCurrency);
      // Don't save auto-detected currency to localStorage
      // Let user manually confirm their preference
    } catch (error) {
      
      console.warn("Failed to auto-detect currency:", error);
      setCurrentCurrency("GBP");
    } finally {
      setIsLoading(false);
    }
  };

  const convertPrice = (gbpCents: number): number => {
    const result = currencyService.convertPrice(gbpCents, currentCurrency);
    if (currentCurrency !== "GBP") {
      console.log(
        `Converting ${gbpCents} GBP cents to ${currentCurrency}: ${result} cents`
      );
    }
    return result;
  };

  const formatPrice = (cents: number, targetCurrency?: string): string => {
    const currency = targetCurrency || currentCurrency;
    const result = currencyService.formatPrice(cents, currency);
    if (currency !== "USD") {
      console.log(`Formatting ${cents} ${currency} cents: ${result}`);
    }
    return result;
  };

  const value: CurrencyContextType = {
    currentCurrency,
    currencies,
    isLoading,
    setCurrency,
    convertPrice,
    formatPrice,
    autoDetectCurrency,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
