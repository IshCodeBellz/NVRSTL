import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import PerformanceDashboard from "@/components/admin/PerformanceDashboard";

export const metadata: Metadata = {
  title: "Performance Dashboard | DY Official Admin",
  description:
    "Database and cache performance monitoring with optimization tools",
};

export default async function PerformancePage() {
  const session = await getServerSession(authOptionsEnhanced);
  const isAdmin = (session?.user as { isAdmin: boolean })?.isAdmin;

  if (!isAdmin) {
    return <div className="p-6">Unauthorized</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PerformanceDashboard />
    </div>
  );
}
