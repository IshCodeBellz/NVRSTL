/* eslint-disable */
"use client";
import { useCart } from "@/components/providers/CartProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentRequestButtonElement,
  useStripe,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";

export default function BagPage() {
  const { items, subtotal, updateQty, removeItem, clear } = useCart();
  const { formatPrice, convertPrice } = useCurrency();
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [checkingOut, setCheckingOut] = useState(false);
  const stripePromise =
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      : null;

  async function handleCheckout() {
    if (items.length === 0 || checkingOut) return;
    setCheckingOut(true);
    try {
      if (authStatus !== "authenticated") {
        // Send user to login, then back to checkout; fallback to /login if callback unsupported.
        router.push(`/login?callbackUrl=${encodeURIComponent("/checkout")}`);
        return;
      }
      // Persist latest cart snapshot to server before navigating so checkout API sees lines.
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: items.map((i) => ({
            productId: i.productId,
            size: i.size,
            qty: i.qty,
            customizations: (i as any).customizations || undefined,
            customKey: (i as any).lineKey || undefined,
          })),
        }),
      }).catch(() => {});
      router.push("/checkout");
    } finally {
      // Do not reset immediately to avoid double-click during navigation
      setTimeout(() => setCheckingOut(false), 800);
    }
  }

  // Express Pay Button component scoped inside bag page
  function ExpressPay() {
    const stripe = useStripe();
    const [available, setAvailable] = useState(false);
    const prRef = useRef<import("@stripe/stripe-js").PaymentRequest | null>(
      null
    );

    useEffect(() => {
      if (!stripe) return;
      const pr = stripe.paymentRequest({
        country: "US",
        currency: "usd",
        total: {
          label: "DY OFFICIALETTE",
          amount: Math.round(subtotal * 100),
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });
      pr.canMakePayment().then((res) => {
        if (res) {
          prRef.current = pr;
          setAvailable(true);
        }
      });
      pr.on("paymentmethod", async (ev) => {
        try {
          // Ensure user is authenticated or redirect
          if (authStatus !== "authenticated") {
            ev.complete("fail");
            router.push(
              `/login?callbackUrl=${encodeURIComponent("/checkout")}`
            );
            return;
          }
          // Persist cart first
          await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lines: items.map((i) => ({
                productId: i.productId,
                size: i.size,
                qty: i.qty,
                customizations: (i as any).customizations || undefined,
                customKey: (i as any).lineKey || undefined,
              })),
            }),
          });
          // Create order + intent
          const checkoutRes = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shippingAddress: {
                fullName: "Wallet Customer",
                line1: "Unknown",
                city: "Unknown",
                postalCode: "00000",
                country: "US",
              },
              idempotencyKey: crypto.randomUUID(),
              lines: items.map((i) => ({
                productId: i.productId,
                size: i.size,
                qty: i.qty,
              })),
            }),
          });
          if (!checkoutRes.ok) throw new Error("Checkout failed");
          const c = await checkoutRes.json();
          const piRes = await fetch("/api/payments/intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: c.orderId }),
          });
          if (!piRes.ok) throw new Error("Intent failed");
          const pi = await piRes.json();
          const { error, paymentIntent } = await stripe.confirmCardPayment(
            pi.clientSecret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: true }
          );
          if (error) {
            await ev.complete("fail");
            return;
          }
          await ev.complete("success");
          if (paymentIntent && paymentIntent.status === "succeeded") {
            clear();
            router.push("/checkout/success");
          } else {
            clear();
            router.push("/checkout/success");
          }
        } catch {
          await ev.complete("fail");
        }
      });
    }, [stripe, authStatus, items, subtotal, router, clear]);

    if (!available || !prRef.current) return null;
    return (
      <div className="mt-2">
        <PaymentRequestButtonElement
          options={{ paymentRequest: prRef.current }}
        />
        <p className="text-xs text-neutral-500 mt-2">Or continue to checkout</p>
      </div>
    );
  }
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Your bag</h1>
      {items.length === 0 && (
        <p className="text-sm text-neutral-600">Your bag is empty.</p>
      )}
      <div className="grid gap-10 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {items.map((line) => (
            <div key={line.id} className="flex gap-4 border-b pb-4">
              <div className="relative w-28 h-36 bg-neutral-100 rounded overflow-hidden">
                <Image
                  src={line.image || "/placeholder.svg"}
                  alt={line.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="font-medium truncate">{line.name}</div>
                <div className="text-xs text-neutral-600">
                  Size: {line.size ? line.size : "One size"}
                </div>
                {line.customizations && (
                  <div className="text-xs text-neutral-700 space-y-0.5 mt-1">
                    {(() => {
                      const c: any = line.customizations as any;
                      const pretty = (s?: string) =>
                        (s || "none")
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (m) => m.toUpperCase());
                      const rows: string[] = [];
                      if (c.patch && c.patch !== "none")
                        rows.push(`Patch: ${pretty(c.patch)}`);
                      if (c.patch2 && c.patch2 !== "none")
                        rows.push(`Second Patch: ${pretty(c.patch2)}`);
                      if (c.sleeveAd && c.sleeveAd !== "none")
                        rows.push(`Sleeve: ${pretty(c.sleeveAd)}`);
                      if (c.nameAndNumber) {
                        const nn = c.nameAndNumber;
                        rows.push(
                          `Name & Number: ${nn.name || ""} ${nn.number || ""}${
                            nn.font ? ` (${String(nn.font).toUpperCase()})` : ""
                          }`.trim()
                        );
                      }
                      return rows.length ? (
                        <ul className="list-disc ml-4">
                          {rows.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      ) : null;
                    })()}
                  </div>
                )}
                <div className="text-sm font-semibold">
                  {formatPrice(convertPrice(line.priceCents))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-xs uppercase tracking-wide">Qty</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={line.qty}
                    onChange={(e) =>
                      updateQty(line.id, parseInt(e.target.value || "1", 10))
                    }
                    className="w-16 border border-neutral-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(line.id)}
                    className="text-xs text-neutral-500 hover:text-neutral-900"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length > 0 && (
            <button onClick={clear} className="btn-outline text-xs">
              Clear bag
            </button>
          )}
        </div>
        <aside className="space-y-4 border rounded p-6 h-fit bg-neutral-50">
          <h2 className="font-semibold">Summary</h2>
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatPrice(convertPrice(Math.round(subtotal * 100)))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Delivery</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPrice(convertPrice(Math.round(subtotal * 100)))}</span>
          </div>
          <button
            disabled={items.length === 0 || checkingOut}
            onClick={handleCheckout}
            className="btn-primary w-full mt-4 disabled:opacity-50"
          >
            {checkingOut
              ? authStatus === "authenticated"
                ? "Loading checkout..."
                : "Redirecting to sign in..."
              : "Checkout"}
          </button>
          {stripePromise && (
            <div className="mt-2">
              <Elements stripe={stripePromise}>
                <ExpressPay />
              </Elements>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
