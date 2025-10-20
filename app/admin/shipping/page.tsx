import { Metadata } from "next";
import { AdminShippingDashboard } from "@/components/admin/AdminShippingDashboard";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shipping Dashboard | Admin Dashboard",
  description:
    "Monitor shipments, track deliveries, and manage shipping operations",
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Shipping Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor shipment status, track deliveries, analyze carrier
                performance, and manage shipping operations.
              </p>
            </div>
            <Link
              href="/admin"
              className="text-sm rounded bg-neutral-200 text-neutral-900 px-3 py-2 hover:bg-neutral-300"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <AdminShippingDashboard />
      </div>
    </div>
  );
}
