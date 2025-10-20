import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import MonitoringDashboard from "@/components/admin/MonitoringDashboard";

export const metadata: Metadata = {
  title: "System Monitoring | DY Official Admin",
  description: "Real-time system monitoring and alerting dashboard",
};

export default async function MonitoringPage() {
  const session = await getServerSession(authOptionsEnhanced);
  const isAdmin = (session?.user as { isAdmin: boolean })?.isAdmin;

  if (!isAdmin) {
    return <div className="p-6">Unauthorized</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <MonitoringDashboard />
    </div>
  );
}
