"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface SyncPaymentButtonProps {
  orderId: string;
  currentStatus: string;
}

export function SyncPaymentButton({
  orderId,
  currentStatus,
}: SyncPaymentButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/orders/${orderId}/sync-payment`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to sync payment");
      }

      if (data.updated?.order) {
        setMessage("Order status updated from Stripe!");
        // Reload page after 1 second to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else if (data.updated?.payment) {
        setMessage("Payment record updated!");
      } else {
        setMessage("Order already in sync with Stripe");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sync with Stripe"
      );
    } finally {
      setSyncing(false);
    }
  };

  // Only show sync button for orders that are awaiting payment or have unknown status
  // (since these are the ones that might need syncing)
  if (currentStatus !== "AWAITING_PAYMENT" && currentStatus !== "PENDING") {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1"
        title="Sync payment status from Stripe"
      >
        <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync Stripe"}
      </button>
      {message && (
        <span className="text-xs text-green-600 font-medium">{message}</span>
      )}
      {error && (
        <span className="text-xs text-red-600 font-medium">{error}</span>
      )}
    </div>
  );
}
