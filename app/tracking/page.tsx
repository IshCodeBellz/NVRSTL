"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AccountNavigation } from "@/components/account/AccountNavigation";

interface TrackingData {
  order: {
    id: string;
    status: string;
    total: number;
    createdAt: string;
    paidAt?: string;
    shippedAt?: string;
    customer: {
      name: string;
    };
    shippingAddress: {
      fullName: string;
      line1: string;
      line2?: string;
      city: string;
      region?: string;
      postalCode: string;
      country: string;
    };
  };
  tracking?: {
    trackingNumber: string;
    carrier: string;
    service: string;
    currentStatus: string;
    estimatedDelivery?: string;
    actualDelivery?: string;
    lastUpdated: string;
    trackingHistory: Array<{
      timestamp: string;
      status: string;
      location?: string;
      description: string;
    }>;
  };
  deliveryProgress: {
    currentStep: number;
    currentLabel: string;
    steps: Array<{
      step: number;
      label: string;
      completed: boolean;
    }>;
    isCompleted: boolean;
    estimatedDelivery?: string;
    actualDelivery?: string;
  };
}

function TrackingPageContent() {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [orderIdInput, setOrderIdInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  const searchParams = useSearchParams();

  const handleTrackingSearch = useCallback(
    async (trackingNumber?: string) => {
      const tracking = trackingNumber || searchInput;
      if (!tracking.trim()) return;

      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/tracking?tracking=${encodeURIComponent(tracking.trim())}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch tracking information");
        }

        setTrackingData(data);
      } catch (err: unknown) {
        setError(
          (err as Error).message || "Failed to fetch tracking information"
        );
        setTrackingData(null);
      } finally {
        setLoading(false);
      }
    },
    [searchInput]
  );

  const handleOrderSearch = useCallback(
    async (orderId?: string, email?: string) => {
      const order = orderId || orderIdInput;
      const orderEmail = email || emailInput;

      if (!order.trim() || !orderEmail.trim()) {
        setError("Please provide both order ID and email address");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/tracking?order=${encodeURIComponent(
            order.trim()
          )}&email=${encodeURIComponent(orderEmail.trim())}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch order information");
        }

        setTrackingData(data);
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to fetch order information");
        setTrackingData(null);
      } finally {
        setLoading(false);
      }
    },
    [orderIdInput, emailInput]
  );

  useEffect(() => {
    // Check URL parameters for tracking info
    const tracking = searchParams?.get("tracking");
    const orderId = searchParams?.get("order");
    const email = searchParams?.get("email");

    if (tracking) {
      setSearchInput(tracking);
      handleTrackingSearch(tracking);
    } else if (orderId && email) {
      setOrderIdInput(orderId);
      setEmailInput(email);
      handleOrderSearch(orderId, email);
    }
    // Only re-run when URL params change or the callbacks change
  }, [searchParams, handleOrderSearch, handleTrackingSearch]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      DELIVERED: "text-green-600",
      OUT_FOR_DELIVERY: "text-blue-600",
      IN_TRANSIT: "text-yellow-600",
      COLLECTED: "text-purple-600",
      LABEL_CREATED: "text-gray-600",
      EXCEPTION: "text-red-600",
      DELIVERY_ATTEMPTED: "text-orange-600",
    };
    return statusColors[status] || "text-gray-600";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-8">
        Track Your Order
      </h1>

      <div className="md:grid md:grid-cols-[230px_1fr] md:gap-10 lg:gap-16">
        {/* Left Navigation */}
        <AccountNavigation />

        {/* Main Content */}
        <div className="space-y-12">
          {/* Search Section */}
          <section id="track-order" className="space-y-4">
            <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              Track Your Package
            </h2>

            <div className="border rounded p-6 bg-white dark:bg-neutral-800 dark:border-neutral-700 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Tracking Number Search */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded flex items-center justify-center bg-neutral-50 dark:bg-neutral-700 border dark:border-neutral-600 text-neutral-500 dark:text-neutral-400">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 12l2 2 4-4" />
                        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.12 0 4.07.74 5.61 1.97" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      Track by Tracking Number
                    </h3>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter tracking number"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-transparent"
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleTrackingSearch()
                    }
                  />
                  <button
                    onClick={() => handleTrackingSearch()}
                    disabled={loading || !searchInput.trim()}
                    className="w-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 py-2 px-4 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Searching..." : "Track Package"}
                  </button>
                </div>

                {/* Order ID Search */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded flex items-center justify-center bg-neutral-50 dark:bg-neutral-700 border dark:border-neutral-600 text-neutral-500 dark:text-neutral-400">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M8 2v4M16 2v4M4 10h16M3 22h18V6H3v16Z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      Track by Order Details
                    </h3>
                  </div>
                  <input
                    type="text"
                    placeholder="Order ID"
                    value={orderIdInput}
                    onChange={(e) => setOrderIdInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-transparent"
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleOrderSearch()}
                    disabled={
                      loading || !orderIdInput.trim() || !emailInput.trim()
                    }
                    className="w-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 py-2 px-4 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Searching..." : "Track Order"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Error Message */}
          {error && (
            <div className="border rounded p-4 bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              <div className="flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Tracking Results */}
          {trackingData && (
            <>
              {/* Order Summary */}
              <section id="order-summary" className="space-y-4">
                <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Order Summary
                </h2>
                <div className="border rounded p-5 flex gap-5 bg-white dark:bg-neutral-800 dark:border-neutral-700">
                  <div className="w-16 h-16 rounded flex items-center justify-center bg-neutral-50 dark:bg-neutral-700 border dark:border-neutral-600 text-neutral-500 dark:text-neutral-400">
                    <svg
                      width="34"
                      height="34"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-70"
                    >
                      <path d="M8 2v4M16 2v4M4 10h16M3 22h18V6H3v16Z" />
                    </svg>
                  </div>
                  <div className="text-sm leading-relaxed">
                    <p className="font-semibold dark:text-white">
                      Order #{trackingData.order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Customer: {trackingData.order.customer.name}
                    </p>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Total: £{trackingData.order.total.toFixed(2)}
                    </p>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Ordered: {formatDate(trackingData.order.createdAt)}
                    </p>
                  </div>
                </div>
              </section>

              {/* Delivery Progress */}
              <section id="delivery-progress" className="space-y-4">
                <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Delivery Progress
                </h2>
                <div className="border rounded p-6 bg-white dark:bg-neutral-800 dark:border-neutral-700">
                  <div className="space-y-4">
                    {trackingData.deliveryProgress.steps.map((step) => (
                      <div key={step.step} className="flex items-center">
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            step.completed
                              ? "bg-green-600 text-white"
                              : step.step ===
                                trackingData.deliveryProgress.currentStep
                              ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                              : "bg-neutral-300 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-400"
                          }`}
                        >
                          {step.completed ? "✓" : step.step}
                        </div>
                        <div className="ml-4">
                          <p
                            className={`font-semibold ${
                              step.step ===
                              trackingData.deliveryProgress.currentStep
                                ? "text-neutral-900 dark:text-white"
                                : "text-neutral-600 dark:text-neutral-400"
                            }`}
                          >
                            {step.label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {trackingData.deliveryProgress.estimatedDelivery && (
                    <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-700 border dark:border-neutral-600 rounded">
                      <p className="text-sm text-neutral-900 dark:text-white font-semibold">
                        Estimated Delivery:{" "}
                        {formatDate(
                          trackingData.deliveryProgress.estimatedDelivery
                        )}
                      </p>
                    </div>
                  )}

                  {trackingData.deliveryProgress.actualDelivery && (
                    <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                      <p className="text-sm text-green-700 dark:text-green-400 font-semibold">
                        Delivered:{" "}
                        {formatDate(
                          trackingData.deliveryProgress.actualDelivery
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Tracking Details */}
              {trackingData.tracking && (
                <section id="tracking-details" className="space-y-4">
                  <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Tracking Details
                  </h2>
                  <div className="border rounded p-5 flex gap-5 bg-white dark:bg-neutral-800 dark:border-neutral-700">
                    <div className="w-16 h-16 rounded flex items-center justify-center bg-neutral-50 dark:bg-neutral-700 border dark:border-neutral-600 text-neutral-500 dark:text-neutral-400">
                      <svg
                        width="34"
                        height="34"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-70"
                      >
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        <path d="M8.5 6.5c.5-1 1.5-1 2.5-1s2 0 2.5 1" />
                        <path d="M17 10c.5 .5 .5 1.2 .5 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8c0-.8 0-1.5.5-2" />
                        <path d="M8 10v4" />
                        <path d="M16 10v4" />
                      </svg>
                    </div>
                    <div className="flex-1 text-sm leading-relaxed">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-neutral-600 dark:text-neutral-400">
                            Tracking Number
                          </p>
                          <p className="font-semibold dark:text-white">
                            {trackingData.tracking.trackingNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-600 dark:text-neutral-400">
                            Carrier
                          </p>
                          <p className="font-semibold dark:text-white">
                            {trackingData.tracking.carrier}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-600 dark:text-neutral-400">
                            Current Status
                          </p>
                          <p
                            className={`font-semibold ${getStatusColor(
                              trackingData.tracking.currentStatus
                            )}`}
                          >
                            {trackingData.tracking.currentStatus.replace(
                              "_",
                              " "
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Tracking History */}
                      <div className="border-t dark:border-neutral-600 pt-4">
                        <h3 className="font-semibold mb-3 dark:text-white">
                          Tracking History
                        </h3>
                        <div className="space-y-3">
                          {trackingData.tracking.trackingHistory.map(
                            (event, index) => (
                              <div
                                key={index}
                                className="border-l-2 border-neutral-200 dark:border-neutral-600 pl-4 pb-3 last:pb-0"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold text-sm dark:text-white">
                                      {event.description}
                                    </p>
                                    {event.location && (
                                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                        {event.location}
                                      </p>
                                    )}
                                  </div>
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap ml-4">
                                    {formatDate(event.timestamp)}
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Shipping Address */}
              <section id="shipping-address" className="space-y-4">
                <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Shipping Address
                </h2>
                <div className="border rounded p-5 flex gap-5 bg-white dark:bg-neutral-800 dark:border-neutral-700">
                  <div className="w-16 h-16 rounded flex items-center justify-center bg-neutral-50 dark:bg-neutral-700 border dark:border-neutral-600 text-neutral-500 dark:text-neutral-400">
                    <svg
                      width="34"
                      height="34"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-70"
                    >
                      <path d="M12 22s8-4.5 8-11a8 8 0 1 0-16 0c0 6.5 8 11 8 11Z" />
                      <circle cx="12" cy="11" r="3" />
                    </svg>
                  </div>
                  <div className="text-sm leading-relaxed">
                    <p className="font-semibold dark:text-white">
                      {trackingData.order.shippingAddress.fullName}
                    </p>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      {trackingData.order.shippingAddress.line1}
                    </p>
                    {trackingData.order.shippingAddress.line2 && (
                      <p className="text-neutral-600 dark:text-neutral-400">
                        {trackingData.order.shippingAddress.line2}
                      </p>
                    )}
                    <p className="text-neutral-600 dark:text-neutral-400">
                      {trackingData.order.shippingAddress.city}
                      {trackingData.order.shippingAddress.region &&
                        `, ${trackingData.order.shippingAddress.region}`}{" "}
                      {trackingData.order.shippingAddress.postalCode}
                    </p>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      {trackingData.order.shippingAddress.country}
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap the component that uses useSearchParams in Suspense to satisfy Next.js requirements
export default function TrackingPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading tracking page…</div>}>
      <TrackingPageContent />
    </Suspense>
  );
}
