"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

const stripePromise =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null;

interface OrderPaymentClientProps {
  orderId: string;
  totalCents: number;
  currency: string;
}

export default function OrderPaymentClient(props: OrderPaymentClientProps) {
  const { orderId, totalCents, currency } = props;
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  const options = useMemo(
    () => ({
      clientSecret: clientSecret ?? undefined,
      appearance: { theme: "stripe" as const },
    }),
    [clientSecret]
  );

  useEffect(() => {
    let cancelled = false;
    async function primeIntent() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/payments/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Unable to set up payment");
        }
        if (!cancelled) {
          setClientSecret(data.clientSecret);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to initialise payment";
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    primeIntent();
    return () => {
      cancelled = true;
    };
  }, [orderId, retry]);

  if (!stripePromise) {
    return (
      <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
        Stripe payments are not configured. Please contact support.
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-neutral-500">Preparing payment…</div>;
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
        <button
          type="button"
          onClick={() => {
            setClientSecret(null);
            setError(null);
            setRetry((n) => n + 1);
          }}
          className="text-sm font-medium text-blue-600 hover:underline"
          disabled={loading}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700">
        Could not prepare payment. Please try again later.
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <OrderPaymentForm
        orderId={orderId}
        totalCents={totalCents}
        currency={currency}
      />
    </Elements>
  );
}

function OrderPaymentForm({
  orderId,
  totalCents,
  currency,
}: {
  orderId: string;
  totalCents: number;
  currency: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedTotal = useMemo(() => {
    try {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
      }).format(totalCents / 100);
    } catch {
      return `${(totalCents / 100).toFixed(2)} ${currency}`;
    }
  }, [currency, totalCents]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/account/orders/${orderId}`,
        },
        redirect: "if_required",
      });
      if (stripeError) {
        throw new Error(stripeError.message || "Payment failed");
      }
      if (paymentIntent?.status === "succeeded") {
        router.push(`/account/orders/${orderId}`);
        router.refresh();
      } else {
        // rely on webhook and redirect, but still nudge user back
        router.push(`/account/orders/${orderId}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded border border-neutral-200 bg-white p-4">
        <PaymentElement id="order-payment-element" options={{ layout: "tabs" }} />
      </div>
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting || !stripe}
        className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {submitting ? "Processing…" : `Pay ${formattedTotal}`}
      </button>
      <button
        type="button"
        onClick={() => router.push(`/account/orders/${orderId}`)}
        className="w-full rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
      >
        Cancel and return to order
      </button>
    </form>
  );
}


