"use client";

import { useEffect, useState } from "react";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { X, Globe } from "lucide-react";

export function CurrencyNotification() {
  const { currentCurrency, setCurrency, currencies } = useCurrency();
  const [detectedCurrency, setDetectedCurrency] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [hasDetected, setHasDetected] = useState(false);

  useEffect(() => {
    const checkCurrencyDetection = async () => {
      // Only show if user hasn't manually set a currency
      const savedCurrency = localStorage.getItem("preferred-currency");
      if (savedCurrency || hasDetected) return;

      try {
        // Import currency service dynamically to avoid SSR issues
        const { currencyService } = await import("@/lib/currency");
        const detected = await currencyService.detectUserCurrency();

        if (detected && detected !== currentCurrency) {
          setDetectedCurrency(detected);
          setShowNotification(true);
          setHasDetected(true);
        }
      } catch (error) {
        
        console.warn("Failed to detect currency:", error);
      }
    };

    // Delay to avoid showing immediately on page load
    const timer = setTimeout(checkCurrencyDetection, 2000);
    return () => clearTimeout(timer);
  }, [currentCurrency, hasDetected]);

  const handleAccept = () => {
    if (detectedCurrency) {
      setCurrency(detectedCurrency);
      localStorage.setItem("currency-detection-accepted", "true");
    }
    setShowNotification(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("currency-detection-dismissed", "true");
    setShowNotification(false);
  };

  if (!showNotification || !detectedCurrency) {
    return null;
  }

  const detectedCurrencyData = currencies.find(
    (c) => c.code === detectedCurrency
  );

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-4 max-w-sm z-50 animate-slide-in">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
            Switch to {detectedCurrencyData?.name}?
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
            We detected you&apos;re in a {detectedCurrencyData?.name} region.
            Would you like to see prices in {detectedCurrencyData?.symbol}{" "}
            {detectedCurrency}?
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAccept}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
            >
              Yes, switch to {detectedCurrency}
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 px-2 py-1.5 transition-colors"
            >
              Keep {currentCurrency}
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
