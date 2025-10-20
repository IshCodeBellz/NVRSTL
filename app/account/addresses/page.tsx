"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { AccountNavigation } from "@/components/account/AccountNavigation";

interface Address {
  id: string;
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
  createdAt: string;
}

export default function AddressesPage() {
  const { data: session } = useSession();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [makeDefault, setMakeDefault] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
    id: number;
  } | null>(null);
  const [newAddress, setNewAddress] = useState({
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "United Kingdom",
    phone: "",
  });

  const fetchAddresses = useCallback(async () => {
    try {
      const response = await fetch("/api/addresses");
      if (response.ok) {
        const data = await response.json();
        setAddresses(data);
      } else {
        showNotification("error", "Failed to load addresses");
      }
    } catch {
      showNotification("error", "Unexpected error loading addresses");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch addresses from database
  useEffect(() => {
    if (session?.user) {
      fetchAddresses();
    }
  }, [session, fetchAddresses]);

  const showNotification = (type: "success" | "error", message: string) => {
    const id = Date.now();
    setNotification({ type, message, id });
    // Auto dismiss after 4s
    setTimeout(() => {
      setNotification((current) => (current?.id === id ? null : current));
    }, 4000);
  };

  const handleAddAddress = async () => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newAddress),
      });

      if (response.ok) {
        const created = await response.json();
        // If user requested to make it default and it's not already default (first address case)
        if (makeDefault && !created.isDefault) {
          await fetch("/api/addresses/set-default", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ addressId: created.id }),
          });
        }
        await fetchAddresses();
        resetForm();
        setShowAddModal(false);
        showNotification("success", "Address added successfully");
      } else {
        const error = await response.json();
        showNotification("error", error.error || "Failed to add address");
      }
    } catch {
      showNotification("error", "Failed to add address");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setNewAddress({
      fullName: address.fullName,
      line1: address.line1,
      line2: address.line2 || "",
      city: address.city,
      region: address.region || "",
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone || "",
    });
    setShowAddModal(true);
  };

  const handleUpdateAddress = async () => {
    if (!editingAddress) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/addresses/${editingAddress.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newAddress),
      });

      if (response.ok) {
        const updated = await response.json();
        if (makeDefault && !updated.isDefault) {
          await fetch("/api/addresses/set-default", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ addressId: updated.id }),
          });
        }
        await fetchAddresses();
        setEditingAddress(null);
        resetForm();
        setShowAddModal(false);
        showNotification("success", "Address updated successfully");
      } else {
        const error = await response.json();
        showNotification("error", error.error || "Failed to update address");
      }
    } catch {
      showNotification("error", "Failed to update address");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const addressToDelete = addresses.find((addr) => addr.id === id);

    if (addressToDelete?.isDefault && addresses.length > 1) {
      if (
        !confirm(
          "This is your default address. Deleting it will set another address as default. Are you sure you want to continue?"
        )
      ) {
        return;
      }
    } else if (!confirm("Are you sure you want to delete this address?")) {
      return;
    }

    try {
      const response = await fetch(`/api/addresses/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchAddresses(); // Refresh the list
        showNotification("success", "Address deleted");
      } else {
        const error = await response.json();
        showNotification("error", error.error || "Failed to delete address");
      }
    } catch {
      showNotification("error", "Failed to delete address");
    }
  };

  const resetForm = () => {
    setNewAddress({
      fullName: "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postalCode: "",
      country: "United Kingdom",
      phone: "",
    });
  };

  const getAddressDisplayName = (address: Address, index: number) => {
    // Use the isDefault field to determine if it's the default address
    if (address.isDefault) {
      return `DEFAULT ADDRESS - ${address.city.toUpperCase()}`;
    }
    return `${address.city.toUpperCase()}-${index}`;
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const response = await fetch("/api/addresses/set-default", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ addressId }),
      });

      if (response.ok) {
        await fetchAddresses(); // Refresh the list to show updated default status
        showNotification("success", "Default address updated");
      } else {
        const error = await response.json();
        showNotification(
          "error",
          error.error || "Failed to set default address"
        );
      }
    } catch {
      showNotification("error", "Failed to set default address");
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-1/4 mb-8"></div>
          <div className="md:grid md:grid-cols-[230px_1fr] md:gap-10 lg:gap-16">
            <div className="space-y-4">
              <div className="h-32 bg-neutral-200 rounded"></div>
              <div className="h-32 bg-neutral-200 rounded"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-48 bg-neutral-200 rounded"></div>
              <div className="h-48 bg-neutral-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-8">Addresses</h1>
      {notification && (
        <div
          className={
            "mb-4 rounded-md border px-4 py-3 text-sm flex items-start gap-3 " +
            (notification.type === "success"
              ? "border-green-300 bg-green-50 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200"
              : "border-red-300 bg-red-50 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200")
          }
          role="status"
        >
          <span className="font-medium">
            {notification.type === "success" ? "Success" : "Error"}:
          </span>
          <span className="flex-1">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-xs opacity-70 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <div className="md:grid md:grid-cols-[230px_1fr] md:gap-10 lg:gap-16">
        {/* Left Navigation */}
        <AccountNavigation showBackToAccount={true} />

        {/* Main Content */}
        <div className="space-y-8">
          {/* Header with Add Button */}
          <div className="flex items-center justify-between">
            <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600">
              ADDRESSES
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-black text-white px-6 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              ADD NEW ADDRESS
            </button>
          </div>

          {/* Addresses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map((address, index) => (
              <div
                key={address.id}
                className="border rounded p-6 bg-white dark:bg-neutral-800 dark:border-neutral-700"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-neutral-800 dark:text-neutral-200">
                      {getAddressDisplayName(address, index)}
                    </h3>
                    {address.isDefault && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        (Default)
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {address.fullName}
                    </p>
                    <p>{address.line1}</p>
                    {address.line2 && <p>{address.line2}</p>}
                    <p>
                      {address.city}
                      {address.region && `, ${address.region}`}
                    </p>
                    <p>{address.postalCode}</p>
                    <p>{address.country}</p>
                    {address.phone && <p>Phone Number: {address.phone}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-600">
                    <button
                      onClick={() => handleEditAddress(address)}
                      className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline"
                    >
                      Edit
                    </button>
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAddress(address.id)}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {addresses.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                No addresses saved yet
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-black text-white px-6 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Add Your First Address
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Address Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                {editingAddress ? "Edit Address" : "Add New Address"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAddress(null);
                  resetForm();
                  setMakeDefault(false);
                }}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newAddress.fullName}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, fullName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  value={newAddress.line1}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, line1: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  placeholder="Enter address line 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={newAddress.line2}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, line2: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  placeholder="Enter address line 2 (optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, city: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    placeholder="Enter city"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    value={newAddress.postalCode}
                    onChange={(e) =>
                      setNewAddress({
                        ...newAddress,
                        postalCode: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    placeholder="Enter postal code"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Country *
                </label>
                <select
                  value={newAddress.country}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, country: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Italy">Italy</option>
                  <option value="Spain">Spain</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newAddress.phone}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  placeholder="Enter phone number"
                />
              </div>
              {/* Make Default Checkbox (shown only when relevant) */}
              {(!editingAddress && addresses.length > 0) ||
              (editingAddress && !editingAddress.isDefault) ? (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    id="makeDefault"
                    type="checkbox"
                    className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                    checked={makeDefault}
                    onChange={(e) => setMakeDefault(e.target.checked)}
                  />
                  <label
                    htmlFor="makeDefault"
                    className="text-sm text-neutral-700 dark:text-neutral-300"
                  >
                    Make this my default shipping address
                  </label>
                </div>
              ) : null}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAddress(null);
                  resetForm();
                  setMakeDefault(false);
                }}
                className="flex-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white py-2 px-4 rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={
                  editingAddress ? handleUpdateAddress : handleAddAddress
                }
                disabled={
                  !newAddress.fullName ||
                  !newAddress.line1 ||
                  !newAddress.city ||
                  !newAddress.postalCode ||
                  submitting
                }
                className="flex-1 bg-black text-white py-2 px-4 rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? "Saving..."
                  : editingAddress
                  ? "Update Address"
                  : "Add Address"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
