"use client";
import { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { PaymentRequest } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  PaymentRequestButtonElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useCart } from "@/components/providers/CartProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { useSession } from "next-auth/react";
import AddressAutocomplete from "@/components/address/AddressAutocomplete";

const stripePromise =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null;

interface PrimedOrderData {
  orderId: string;
  clientSecret: string;
  paymentIntentId: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
}

export default function CheckoutClient() {
  const { items, subtotal, clear, hydrated } = useCart();
  const { formatPrice, convertPrice } = useCurrency();
  const { status: authStatus } = useSession();
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [primed, setPrimed] = useState<PrimedOrderData | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [discountInput, setDiscountInput] = useState("");
  const [discountStatus, setDiscountStatus] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "invalid"; reason: string }
    | {
        state: "valid";
        kind: "fixed" | "percent";
        valueCents: number | null;
        percent: number | null;
        minSubtotalCents: number | null;
      }
  >({ state: "idle" });
  const lastValidated = useRef<string>("");

  // Addresses & shipping form state
  type AddressDTO = {
    id: string;
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    region: string | null;
    postalCode: string;
    country: string;
    phone: string | null;
    isDefault: boolean;
  };
  const [addresses, setAddresses] = useState<AddressDTO[]>([]);
  const [saveAddresses, setSaveAddresses] = useState<boolean>(true);
  const [selectedAddressId, setSelectedAddressId] = useState<
    string | "custom" | null
  >(null);
  const [shipping, setShipping] = useState({
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    phone: "",
  });

  useEffect(() => {
    let active = true;
    async function loadAddresses() {
      if (authStatus !== "authenticated") return;
      try {
        const res = await fetch("/api/addresses", { cache: "no-store" });
        if (!res.ok) return;
        const list: AddressDTO[] = await res.json();
        if (!active) return;
        setAddresses(list || []);
        if (list && list.length > 0) {
          const def = list[0];
          setSelectedAddressId(def.id);
          setShipping({
            fullName: def.fullName || "",
            line1: def.line1 || "",
            line2: def.line2 || "",
            city: def.city || "",
            region: def.region || "",
            postalCode: def.postalCode || "",
            country: def.country || "",
            phone: def.phone || "",
          });
        }
      } catch {
        // ignore
      }
    }
    loadAddresses();
    return () => {
      active = false;
    };
  }, [authStatus]);

  function applyAddress(id: string | "custom") {
    setSelectedAddressId(id);
    if (id === "custom") return; // keep current edits
    const addr = addresses.find((a) => a.id === id);
    if (!addr) return;
    setShipping({
      fullName: addr.fullName || "",
      line1: addr.line1 || "",
      line2: addr.line2 || "",
      city: addr.city || "",
      region: addr.region || "",
      postalCode: addr.postalCode || "",
      country: addr.country || "",
      phone: addr.phone || "",
    });
  }

  // Debounced live validation of discount code
  useEffect(() => {
    const code = discountInput.trim();
    if (!code) {
      setDiscountStatus({ state: "idle" });
      return;
    }
    setDiscountStatus({ state: "checking" });
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/discount-codes/validate?code=${encodeURIComponent(code)}`
        );
        if (!res.ok) {
          setDiscountStatus({ state: "invalid", reason: "server" });
          return;
        }
        const data = await res.json();
        if (!data.valid) {
          setDiscountStatus({
            state: "invalid",
            reason: data.reason || "invalid",
          });
        } else {
          lastValidated.current = code.toUpperCase();
          // normalise API kind ("FIXED"/"PERCENT") to lowercase for UI logic
          const normalizedKind = String(data.kind || "").toLowerCase();
          const kind: "fixed" | "percent" =
            normalizedKind === "fixed" || normalizedKind === "percent"
              ? normalizedKind
              : "fixed"; // default fallback
          setDiscountStatus({
            state: "valid",
            kind,
            valueCents: data.valueCents,
            percent: data.percent,
            minSubtotalCents: data.minSubtotalCents,
          });
        }
      } catch {
        setDiscountStatus({ state: "invalid", reason: "network" });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [discountInput]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (authStatus !== "authenticated")
        throw new Error("Please sign in first");
      if (!hydrated) throw new Error("Cart not ready yet");
      if (items.length === 0) throw new Error("Empty cart");
      // Persist cart to backend (replace existing)
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: items.map((i) => ({
            productId: i.productId,
            size: i.size,
            qty: i.qty,
          })),
        }),
      });
      const fd = new FormData(e.target as HTMLFormElement);
      // Use controlled shipping state (prefilled with default address but editable)
      const shippingPayload = {
        fullName: shipping.fullName,
        line1: shipping.line1,
        line2: shipping.line2 || undefined,
        city: shipping.city,
        region: shipping.region || undefined,
        postalCode: shipping.postalCode,
        country: shipping.country,
        phone: shipping.phone || undefined,
      };
      const discountCode = discountInput.trim() || undefined;
      // Ensure we only send validated code (avoid typos mid-change)
      const codeToSend =
        discountCode && discountCode.toUpperCase() === lastValidated.current
          ? discountCode
          : undefined;
      const email = (fd.get("email") as string) || undefined;
      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress: shippingPayload,
          email,
          discountCode: codeToSend,
          idempotencyKey,
          saveAddresses,
          // Provide lines as safety net if server cart lost (race / db reset)
          lines: items.map((i) => ({
            productId: i.productId,
            size: i.size,
            qty: i.qty,
          })),
        }),
      });
      if (!checkoutRes.ok) {
        const text = await checkoutRes.text();
        let data: { error?: string } = {};
        try {
          data = JSON.parse(text);
        } catch {}
        throw new Error(
          data.error
            ? `Checkout failed: ${data.error}`
            : `Checkout failed (${checkoutRes.status})`
        );
      }
      const checkoutData = await checkoutRes.json();
      // Create payment intent
      const piRes = await fetch("/api/payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: checkoutData.orderId }),
      });
      if (!piRes.ok) {
        const text = await piRes.text();
        let data: { error?: string } = {};
        try {
          data = JSON.parse(text);
        } catch {}
        throw new Error(
          data.error
            ? `Payment intent failed: ${data.error}`
            : `Payment intent failed (${piRes.status})`
        );
      }
      const piData = await piRes.json();
      setPrimed({
        orderId: checkoutData.orderId,
        clientSecret: piData.clientSecret,
        paymentIntentId: piData.paymentIntentId,
        subtotalCents: checkoutData.subtotalCents,
        discountCents: checkoutData.discountCents,
        totalCents: checkoutData.totalCents,
        currency: checkoutData.currency || "USD",
      });
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (step === "success") {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold mb-4">Thank you!</h1>
        <p className="text-sm text-neutral-600">Your payment was received.</p>
      </div>
    );
  }

  if (step === "payment" && primed && stripePromise) {
    return (
      <Elements
        options={{ clientSecret: primed.clientSecret }}
        stripe={stripePromise}
      >
        <PaymentStep
          primed={primed}
          onSuccess={() => {
            clear();
            setStep("success");
          }}
        />
      </Elements>
    );
  }

  // Simulated payment mode (no publishable key). Provide a confirmation UI.
  if (step === "payment" && primed && !stripePromise) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg">
        <h1 className="text-2xl font-semibold mb-4">Payment (Simulated)</h1>
        <p className="text-sm text-neutral-600 mb-4">
          Stripe publishable key is not configured. This environment runs in
          simulated mode. Confirm below to mark the order as paid.
        </p>
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded text-sm mb-4">
            {error}
          </div>
        )}
        <div className="border rounded p-4 space-y-2 text-sm mb-6">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(primed.subtotalCents)}</span>
          </div>
          {primed.discountCents > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount</span>
              <span>-{formatPrice(primed.discountCents)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Total</span>
            <span>{formatPrice(primed.totalCents)}</span>
          </div>
        </div>

        {/* Save address preference */}
        <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={saveAddresses}
            onChange={(e) => setSaveAddresses(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-400"
          />
          Save this address to my account
        </label>
        <button
          className="btn-primary w-full mb-3"
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              // Simulate webhook success so downstream metrics update.
              const res = await fetch("/api/webhooks/stripe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "payment_intent.succeeded",
                  data: { object: { metadata: { orderId: primed.orderId } } },
                }),
              });
              if (!res.ok) {
                const t = await res.text();
                throw new Error(`Webhook simulate failed (${res.status}) ${t}`);
              }
              clear();
              setStep("success");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Simulate failed");
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          {loading ? "Confirming..." : "Confirm payment"}
        </button>
        <button
          type="button"
          className="w-full text-sm text-neutral-500 underline"
          onClick={() => {
            // Allow user to go back and edit details
            setStep("form");
          }}
        >
          Edit details
        </button>
      </div>
    );
  }

  if (authStatus === "loading" || !hydrated) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Preparing checkout…
        </p>
      </div>
    );
  }
  if (authStatus !== "authenticated") {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold mb-4 dark:text-white">
          Checkout
        </h1>
        <p className="text-sm dark:text-neutral-300">
          Please sign in to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6 dark:text-white">Checkout</h1>
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-2 rounded text-sm mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 font-medium text-neutral-700 dark:text-neutral-300">
          Shipping
        </div>
        {addresses.length > 0 && (
          <div className="md:col-span-2 -mt-2 mb-1">
            <label className="text-xs text-neutral-600 dark:text-neutral-400 mr-2">
              Saved address
            </label>
            <div className="relative">
              <select
                className="input w-full pr-12 appearance-none bg-transparent"
                value={selectedAddressId ?? "custom"}
                onChange={(e) => applyAddress(e.target.value as string)}
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {`${a.fullName} — ${a.city}, ${a.country}${
                      a.isDefault ? " (default)" : ""
                    }`}
                  </option>
                ))}
                <option value="custom">Use a different address…</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" />
                </svg>
              </span>
            </div>
            <button
              type="button"
              className="mt-1 text-xs underline text-neutral-600"
              onClick={() =>
                setShipping({
                  fullName: "",
                  line1: "",
                  line2: "",
                  city: "",
                  region: "",
                  postalCode: "",
                  country: "",
                  phone: "",
                })
              }
            >
              Clear fields
            </button>
          </div>
        )}
        <input
          name="fullName"
          required
          placeholder="Full name"
          className="input"
          value={shipping.fullName}
          autoComplete="name"
          onChange={(e) =>
            setShipping((s) => ({ ...s, fullName: e.target.value }))
          }
        />
        <input
          name="email"
          type="email"
          placeholder="Email (optional)"
          className="input"
          autoComplete="email"
        />
        <AddressAutocomplete
          value={shipping.line1}
          country={shipping.country}
          onChange={(v) => setShipping((s) => ({ ...s, line1: v }))}
          onSelect={(parts) =>
            setShipping((s) => ({
              ...s,
              line1: parts.line1 || s.line1,
              city: parts.city || s.city,
              region: parts.region || s.region,
              postalCode: parts.postalCode || s.postalCode,
              country: parts.country || s.country,
            }))
          }
        />
        <input
          name="line2"
          placeholder="Address line 2"
          className="input"
          value={shipping.line2}
          autoComplete="address-line2"
          onChange={(e) =>
            setShipping((s) => ({ ...s, line2: e.target.value }))
          }
        />
        <input
          name="city"
          required
          placeholder="City"
          className="input"
          value={shipping.city}
          autoComplete="address-level2"
          onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
        />
        <input
          name="region"
          placeholder="Region / State"
          className="input"
          value={shipping.region}
          autoComplete="address-level1"
          onChange={(e) =>
            setShipping((s) => ({ ...s, region: e.target.value }))
          }
        />
        <input
          name="postalCode"
          required
          placeholder="Postal code"
          className="input"
          value={shipping.postalCode}
          autoComplete="postal-code"
          onChange={(e) =>
            setShipping((s) => ({ ...s, postalCode: e.target.value }))
          }
        />
        <input
          name="country"
          required
          placeholder="Country"
          className="input"
          value={shipping.country}
          autoComplete="country"
          onChange={(e) =>
            setShipping((s) => ({ ...s, country: e.target.value }))
          }
        />
        <input
          name="phone"
          placeholder="Phone"
          className="input"
          value={shipping.phone}
          autoComplete="tel"
          onChange={(e) =>
            setShipping((s) => ({ ...s, phone: e.target.value }))
          }
        />
        {/* Save address preference */}
        <div className="md:col-span-2 -mt-1">
          <label className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 select-none">
            <input
              type="checkbox"
              checked={saveAddresses}
              onChange={(e) => setSaveAddresses(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-400"
            />
            Save this address to my account
          </label>
        </div>
        <div className="md:col-span-2 mt-4 font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
          <span>Discount code</span>
        </div>
        <div className="space-y-1 md:col-span-2">
          <input
            name="discountCode"
            placeholder="CODE"
            className="input"
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
          />
          {discountStatus.state === "checking" && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Checking…
            </p>
          )}
          {discountStatus.state === "invalid" && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {discountStatus.reason === "not_found" && "Code not found"}
              {discountStatus.reason === "missing_code" && "Enter a code"}
              {discountStatus.reason === "network" && "Network error"}
              {!["not_found", "missing_code", "network"].includes(
                discountStatus.reason
              ) && "Not valid"}
            </p>
          )}
          {discountStatus.state === "valid" && (
            <p className="text-xs text-green-600 dark:text-green-400">
              {discountStatus.kind === "fixed"
                ? `Valid: saves ${formatPrice(
                    convertPrice(discountStatus.valueCents || 0)
                  )}`
                : `Valid: ${discountStatus.percent}% off`}
              {discountStatus.minSubtotalCents
                ? ` (min ${formatPrice(
                    convertPrice(discountStatus.minSubtotalCents)
                  )})`
                : ""}
            </p>
          )}
        </div>
        <div className="md:col-span-2 border-t pt-4 mt-2 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(convertPrice(Math.round(subtotal * 100)))}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{formatPrice(0)}</span>
          </div>
          {discountStatus.state === "valid" && (
            <div className="flex justify-between text-green-700">
              <span>Discount</span>
              <span>
                {discountStatus.kind === "fixed"
                  ? "-" +
                    formatPrice(convertPrice(discountStatus.valueCents || 0))
                  : `-${discountStatus.percent}%`}
              </span>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Total</span>
            <span>
              {(() => {
                const base = Math.round(subtotal * 100);
                if (discountStatus.state !== "valid")
                  return formatPrice(convertPrice(base));
                if (discountStatus.kind === "fixed") {
                  const v = Math.min(base, discountStatus.valueCents || 0);
                  return formatPrice(convertPrice(base - v));
                }
                const pct = discountStatus.percent || 0;
                const off = Math.floor((base * pct) / 100);
                return formatPrice(convertPrice(base - off));
              })()}
            </span>
          </div>
        </div>
        <div className="md:col-span-2">
          <button
            disabled={loading || items.length === 0}
            className="btn-primary w-full"
          >
            {loading ? "Processing..." : "Continue to payment"}
          </button>
        </div>
      </form>
      {!stripePromise && (
        <p className="text-xs text-neutral-500 mt-4">
          Stripe publishable key not configured — payment step simulated only.
        </p>
      )}
    </div>
  );
}

function PaymentStep({
  primed,
  onSuccess,
}: {
  primed: PrimedOrderData;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [prAvailable, setPrAvailable] = useState(false);
  const paymentRequestRef = useRef<PaymentRequest | null>(null);

  // Initialize Payment Request Button (Apple Pay / Google Pay)
  useEffect(() => {
    if (!stripe || !primed) return;
    const country = primed.currency?.toUpperCase() === "GBP" ? "GB" : "US";
    const currency = (primed.currency || "USD").toLowerCase();
    const pr = stripe.paymentRequest({
      country,
      currency,
      total: { label: "DY OFFICIALETTE Order", amount: primed.totalCents },
      requestPayerName: true,
      requestPayerEmail: true,
      requestShipping: false,
    });

    pr.canMakePayment().then((result) => {
      if (result) {
        paymentRequestRef.current = pr;
        setPrAvailable(true);
      } else {
        setPrAvailable(false);
      }
    });

    // Handle wallet payment method
    pr.on("paymentmethod", async (ev) => {
      try {
        setSubmitting(true);
        setErr(null);
        const { error, paymentIntent } = await stripe.confirmCardPayment(
          primed.clientSecret,
          {
            payment_method: ev.paymentMethod.id,
          },
          { handleActions: true }
        );
        if (error) {
          await ev.complete("fail");
          setErr(error.message || "Payment error");
          setSubmitting(false);
          return;
        }
        await ev.complete("success");
        if (paymentIntent && paymentIntent.status === "succeeded") {
          onSuccess();
        } else {
          // If additional actions were required and completed, consider it success
          onSuccess();
        }
      } catch (e) {
        await ev.complete("fail");
        setErr(e instanceof Error ? e.message : "Payment error");
      } finally {
        setSubmitting(false);
      }
    });

    return () => {
      // No explicit teardown required; element unmount handles listeners
    };
  }, [stripe, primed, onSuccess]);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url:
          window.location.origin + "/account/orders/" + primed.orderId,
      },
      redirect: "if_required",
    });
    if (error) {
      setErr(error.message || "Payment error");
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess();
    } else {
      // rely on webhook + redirect
      onSuccess();
    }
    setSubmitting(false);
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <h1 className="text-2xl font-semibold mb-6">Payment</h1>
      <form onSubmit={handlePay} className="space-y-4">
        {prAvailable && paymentRequestRef.current && (
          <div className="mb-2">
            <PaymentRequestButtonElement
              options={{ paymentRequest: paymentRequestRef.current }}
            />
            <div className="text-xs text-neutral-500 mt-2">
              Or pay with your card below
            </div>
          </div>
        )}
        <PaymentElement />
        {err && (
          <div className="bg-red-100 text-red-600 p-2 rounded text-sm">
            {err}
          </div>
        )}
        <button disabled={!stripe || submitting} className="btn-primary w-full">
          {submitting ? "Paying..." : "Pay now"}
        </button>
      </form>
    </div>
  );
}
