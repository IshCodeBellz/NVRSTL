"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AccountNavigation } from "@/components/account/AccountNavigation";
import { CreditCard, Plus, Trash2 } from "lucide-react";

interface PaymentMethod {
  id: string;
  type: "card" | "paypal" | "apple_pay" | "google_pay";
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  holderName?: string;
  isDefault: boolean;
  createdAt: string;
}

export default function PaymentDetailsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newPayment, setNewPayment] = useState({
    type: "card" as const,
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    holderName: "",
    isDefault: false,
  });

  // Mock data for demonstration - replace with actual API calls
  useEffect(() => {
    if (session?.user) {
      // Simulate loading payment methods
      setTimeout(() => {
        setPaymentMethods([
          {
            id: "1",
            type: "card",
            last4: "4242",
            brand: "Visa",
            expiryMonth: 12,
            expiryYear: 2025,
            holderName: "John Doe",
            isDefault: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: "2",
            type: "card",
            last4: "1234",
            brand: "Mastercard",
            expiryMonth: 8,
            expiryYear: 2026,
            holderName: "John Doe",
            isDefault: false,
            createdAt: new Date().toISOString(),
          },
        ]);
        setLoading(false);
      }, 1000);
    }
  }, [session]);

  const getBrandIcon = (brand: string) => {
    switch (brand?.toLowerCase()) {
      case "visa":
        return "💳";
      case "mastercard":
        return "💳";
      case "amex":
        return "💳";
      default:
        return "💳";
    }
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case "paypal":
        return "🅿️";
      case "apple_pay":
        return "🍎";
      case "google_pay":
        return "🔵";
      default:
        return "💳";
    }
  };

  const handleAddPayment = async () => {
    setSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newMethod: PaymentMethod = {
        id: Date.now().toString(),
        type: newPayment.type,
        last4: newPayment.cardNumber.slice(-4),
        brand: "Visa", // This would be determined by the payment processor
        expiryMonth: parseInt(newPayment.expiryMonth),
        expiryYear: parseInt(newPayment.expiryYear),
        holderName: newPayment.holderName,
        isDefault: newPayment.isDefault || paymentMethods.length === 0,
        createdAt: new Date().toISOString(),
      };

      setPaymentMethods((prev) => [...prev, newMethod]);
      resetForm();
      setShowAddModal(false);
      alert("Payment method added successfully!");
    } catch {
      alert("Failed to add payment method");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment method?")) {
      return;
    }

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setPaymentMethods((prev) => prev.filter((pm) => pm.id !== id));
      alert("Payment method deleted successfully!");
    } catch {
      alert("Failed to delete payment method");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setPaymentMethods((prev) =>
        prev.map((pm) => ({ ...pm, isDefault: pm.id === id }))
      );
      alert("Default payment method updated!");
    } catch {
      alert("Failed to update default payment method");
    }
  };

  const resetForm = () => {
    setNewPayment({
      type: "card",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      holderName: "",
      isDefault: false,
    });
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      value: month.toString().padStart(2, "0"),
      label: month.toString().padStart(2, "0"),
    };
  });

  const years = Array.from({ length: 10 }, (_, i) => {
    const year = new Date().getFullYear() + i;
    return { value: year.toString(), label: year.toString() };
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-1/3 mb-8"></div>
          <div className="md:grid md:grid-cols-[230px_1fr] md:gap-10 lg:gap-16">
            <div className="space-y-4">
              <div className="h-32 bg-neutral-200 rounded"></div>
              <div className="h-32 bg-neutral-200 rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-64 bg-neutral-200 rounded"></div>
              <div className="h-48 bg-neutral-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-8">
        Payment Details
      </h1>

      <div className="md:grid md:grid-cols-[230px_1fr] md:gap-10 lg:gap-16">
        {/* Left Navigation */}
        <AccountNavigation showBackToAccount={true} />

        {/* Main Content */}
        <div className="space-y-8">
          {/* Header with Add Button */}
          <div className="flex items-center justify-between">
            <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600">
              PAYMENT METHODS
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-black text-white px-6 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              ADD CREDIT / DEBIT CARD
            </button>
          </div>

          {/* Payment Methods Grid */}
          <div className="space-y-4">
            {paymentMethods.map((payment) => (
              <div
                key={payment.id}
                className="border rounded-lg p-6 bg-white dark:bg-neutral-800 dark:border-neutral-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-neutral-100 dark:bg-neutral-700 rounded flex items-center justify-center text-lg">
                      {payment.type === "card"
                        ? getBrandIcon(payment.brand || "")
                        : getPaymentIcon(payment.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-neutral-900 dark:text-white">
                          {payment.type === "card"
                            ? `${payment.brand} ending in ${payment.last4}`
                            : payment.type === "paypal"
                            ? "PayPal"
                            : payment.type === "apple_pay"
                            ? "Apple Pay"
                            : "Google Pay"}
                        </h3>
                        {payment.isDefault && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                            Default
                          </span>
                        )}
                      </div>
                      {payment.type === "card" && (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Expires{" "}
                          {payment.expiryMonth?.toString().padStart(2, "0")}/
                          {payment.expiryYear} • {payment.holderName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!payment.isDefault && (
                      <button
                        onClick={() => handleSetDefault(payment.id)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePayment(payment.id)}
                      className="p-2 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {paymentMethods.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                No Payment Methods
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                You currently have no card details saved. You can add or delete
                a card at any time.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-black text-white px-6 py-3 text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                ADD CREDIT / DEBIT CARD
              </button>
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0">
                🔒
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                  Your payment information is secure
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  We use industry-standard encryption to protect your payment
                  details. Your card information is stored securely and never
                  shared with third parties.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Payment Method Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                Add Credit / Debit Card
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Cardholder Name *
                </label>
                <input
                  type="text"
                  value={newPayment.holderName}
                  onChange={(e) =>
                    setNewPayment({ ...newPayment, holderName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  placeholder="Enter cardholder name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Card Number *
                </label>
                <input
                  type="text"
                  value={newPayment.cardNumber}
                  onChange={(e) => {
                    // Format card number with spaces
                    const value = e.target.value
                      .replace(/\s/g, "")
                      .replace(/(.{4})/g, "$1 ")
                      .trim();
                    if (value.replace(/\s/g, "").length <= 16) {
                      setNewPayment({ ...newPayment, cardNumber: value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Month *
                  </label>
                  <select
                    value={newPayment.expiryMonth}
                    onChange={(e) =>
                      setNewPayment({
                        ...newPayment,
                        expiryMonth: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  >
                    <option value="">MM</option>
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Year *
                  </label>
                  <select
                    value={newPayment.expiryYear}
                    onChange={(e) =>
                      setNewPayment({
                        ...newPayment,
                        expiryYear: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  >
                    <option value="">YYYY</option>
                    {years.map((year) => (
                      <option key={year.value} value={year.value}>
                        {year.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    CVV *
                  </label>
                  <input
                    type="text"
                    value={newPayment.cvv}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 4) {
                        setNewPayment({ ...newPayment, cvv: value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="setDefault"
                  checked={newPayment.isDefault}
                  onChange={(e) =>
                    setNewPayment({
                      ...newPayment,
                      isDefault: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 border-neutral-300 dark:border-neutral-600 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="setDefault"
                  className="text-sm text-neutral-900 dark:text-white"
                >
                  Set as default payment method
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="flex-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white py-2 px-4 rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleAddPayment}
                disabled={
                  !newPayment.holderName ||
                  !newPayment.cardNumber ||
                  !newPayment.expiryMonth ||
                  !newPayment.expiryYear ||
                  !newPayment.cvv ||
                  submitting
                }
                className="flex-1 bg-black text-white py-2 px-4 rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Adding..." : "Add Card"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
