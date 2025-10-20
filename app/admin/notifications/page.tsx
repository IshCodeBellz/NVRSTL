import { Metadata } from "next";
import Link from "next/link";
import { AdminNotificationDashboard } from "@/components/admin/AdminNotificationDashboard";

export const metadata: Metadata = {
  title: "Notifications | Admin Dashboard",
  description: "Monitor and manage system notifications",
};

export default function NotificationsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Monitor notification delivery, view system alerts, and track
            customer communications.
          </p>
        </div>
        <div className="space-x-2">
          <Link
            href="/admin/shipping"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            📦 Shipping Dashboard
          </Link>
        </div>
      </div>

      <AdminNotificationDashboard />
    </div>
  );
}
