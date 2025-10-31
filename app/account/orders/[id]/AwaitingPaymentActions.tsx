"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AwaitingPaymentActions({
  orderId,
}: {
  orderId: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCancel() {
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Unable to cancel order");
      }
      setMessage("Order cancelled.");
      router.refresh();
    } catch (error) {
      const err = error instanceof Error ? error.message : "Cancellation failed";
      setMessage(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/account/orders/${orderId}/pay`}
          className="inline-flex items-center justify-center rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Continue to payment
        </Link>
        <button
          type="button"
          onClick={handleCancel}
          disabled={submitting}
          className="inline-flex items-center justify-center rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-60"
        >
          {submitting ? "Cancelling…" : "Cancel order"}
        </button>
      </div>
      {message && (
        <p className="text-xs text-neutral-500" role="status">
          {message}
        </p>
      )}
    </div>
  );
}


