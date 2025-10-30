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
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { ClientPrice } from "@/components/ui/ClientPrice";

export default function BagPage() {
  const { items, subtotal, updateQty, removeItem, clear } = useCart();
  const { formatPrice, convertPrice, currentCurrency } = useCurrency();
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
      // Align wallet country/currency with the shopper's selected currency
      const walletCountry =
        currentCurrency === "GBP" ? "GB" : currentCurrency === "EUR" ? "IE" : "US";
      const walletCurrency = (currentCurrency || "USD").toLowerCase();

      const pr = stripe.paymentRequest({
        country: walletCountry,
        currency: walletCurrency,
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
                // Use a country aligned with the wallet currency so server currency matches
                country: walletCountry,
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
    }, [stripe, authStatus, items, subtotal, router, clear, currentCurrency]);

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
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white font-carbon uppercase">
            Your Bag
          </h1>
          {items.length > 0 && (
            <p className="text-sm text-gray-300 mt-1">
              {items.length} item{items.length !== 1 ? "s" : ""} in your bag
            </p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center shadow-sm border border-gray-700">
              <ShoppingBag className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 font-carbon uppercase">
              Your bag is empty
            </h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Start shopping to add items to your bag.
            </p>
            <a
              href="/drops"
              className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium font-carbon uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              Start Shopping
            </a>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
            {/* Cart Items */}
            <div className="space-y-4">
              {items.map((line) => (
                <div
                  key={line.id}
                  className="bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-700"
                >
                  <div className="flex gap-4">
                    <div className="relative w-24 h-32 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={line.image || "/placeholder.svg"}
                        alt={line.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="font-medium text-sm text-white line-clamp-2 font-carbon">
                        {line.name}
                      </div>
                      <div className="text-xs text-gray-300">
                        Size: {line.size ? line.size : "One size"}
                      </div>
                      {line.customizations && (
                        <div className="text-xs text-gray-300 space-y-1">
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
                                `Name & Number: ${nn.name || ""} ${
                                  nn.number || ""
                                }${
                                  nn.font
                                    ? ` (${String(nn.font).toUpperCase()})`
                                    : ""
                                }`.trim()
                              );
                            }
                            return rows.length ? (
                              <ul className="list-disc ml-4 space-y-0.5">
                                {rows.map((r, idx) => (
                                  <li key={idx}>{r}</li>
                                ))}
                              </ul>
                            ) : null;
                          })()}
                        </div>
                      )}
                      <div className="text-sm font-semibold text-white">
                        <ClientPrice
                          cents={line.priceCents}
                          className="text-sm font-semibold"
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs uppercase tracking-wide text-gray-300">
                            Qty
                          </label>
                          <div className="flex items-center border border-gray-600 rounded-lg">
                            <button
                              type="button"
                              onClick={() =>
                                updateQty(line.id, Math.max(1, line.qty - 1))
                              }
                              className="p-1 hover:bg-gray-700 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={line.qty}
                              onChange={(e) =>
                                updateQty(
                                  line.id,
                                  parseInt(e.target.value || "1", 10)
                                )
                              }
                              className="w-12 text-center text-sm border-0 focus:outline-none focus:ring-0 bg-transparent text-white"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateQty(line.id, Math.min(99, line.qty + 1))
                              }
                              className="p-1 hover:bg-gray-700 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(line.id)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {items.length > 0 && (
                <button
                  onClick={clear}
                  className="w-full text-sm text-gray-300 hover:text-red-400 py-2 border border-gray-600 rounded-lg hover:border-red-400 transition-colors font-medium"
                >
                  Clear bag
                </button>
              )}
            </div>
            {/* Order Summary */}
            <aside className="bg-gray-800 rounded-lg p-6 shadow-sm h-fit border border-gray-700">
              <h2 className="text-lg font-bold text-white mb-4 font-carbon uppercase">
                Order Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Subtotal</span>
                  <span className="font-medium text-white">
                    <ClientPrice
                      cents={Math.round(subtotal * 100)}
                      className="text-sm font-medium"
                    />
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Delivery</span>
                  <span className="text-gray-300">Calculated at checkout</span>
                </div>
                <div className="border-t border-gray-600 pt-3 flex justify-between">
                  <span className="font-bold text-white">Total</span>
                  <span className="font-bold text-white">
                    <ClientPrice
                      cents={Math.round(subtotal * 100)}
                      className="text-base font-bold"
                    />
                  </span>
                </div>
              </div>
              <button
                disabled={items.length === 0 || checkingOut}
                onClick={handleCheckout}
                className="w-full mt-6 bg-white text-black py-3 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 font-carbon uppercase tracking-wider"
              >
                {checkingOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {authStatus === "authenticated"
                      ? "Loading checkout..."
                      : "Redirecting to sign in..."}
                  </>
                ) : (
                  <>
                    Checkout
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              {stripePromise && (
                <div className="mt-4">
                  <Elements stripe={stripePromise}>
                    <ExpressPay />
                  </Elements>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
