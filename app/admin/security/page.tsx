import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import { SecurityService } from "@/lib/server/securityService";
import Link from "next/link";

export const revalidate = 30; // More frequent updates for security

export default async function SecurityPage() {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = (session?.user as { id: string })?.id;
  if (!uid) redirect("/login?callbackUrl=/admin/security");

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.isAdmin) redirect("/");

  // Real security data from SecurityService
  const [securityStats, recentSecurityEvents] = await Promise.all([
    SecurityService.getSecurityStats(),
    SecurityService.getRecentSecurityEvents(),
    // Note: Blocked IPs functionality not yet implemented in UI
  ]);

  const topThreats = [
    { threat: "Brute Force Attacks", count: 156, trend: "+12%" },
    { threat: "High-Risk IPs", count: 89, trend: "-5%" },
    { threat: "CAPTCHA Failures", count: 234, trend: "+8%" },
    { threat: "MFA Bypass Attempts", count: 12, trend: "-15%" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Security Management
          </h1>
          <p className="text-neutral-600 mt-2">
            Monitor threats, configure security settings, and manage access
            controls
          </p>
        </div>
        <div className="flex gap-3">
          <button className="text-sm rounded bg-red-600 text-white px-3 py-2 hover:bg-red-700">
            Security Incident
          </button>
          <Link
            href="/admin"
            className="text-sm rounded bg-neutral-200 text-neutral-900 px-3 py-2 hover:bg-neutral-300"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Security Status Overview */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Blocked IPs"
          value={securityStats.blockedIPs.toString()}
          subtitle="Auto-blocked threats"
          color="red"
          trend="Last 24h"
        />
        <StatCard
          title="Rate Limit Violations"
          value={securityStats.rateLimitViolations.toString()}
          subtitle="Requests blocked"
          color="orange"
          trend="Last 24h"
        />
        <StatCard
          title="MFA Enabled Users"
          value={securityStats.mfaUsers.toLocaleString()}
          subtitle="Security enhanced"
          color="green"
          trend="Total active"
        />
        <StatCard
          title="Recent Events"
          value={securityStats.recentEvents.toString()}
          subtitle="Last hour"
          color="blue"
          trend="Hourly"
        />
        <StatCard
          title="Security Alerts"
          value={securityStats.securityAlerts.toString()}
          subtitle="Require attention"
          color="yellow"
          trend="Active"
        />
        <StatCard
          title="Suspicious Activity"
          value={securityStats.suspiciousActivity.toString()}
          subtitle="Under review"
          color="purple"
          trend="Last hour"
        />
      </section>

      {/* Recent Security Events */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Security Events</h2>
          <button className="text-sm text-blue-600 hover:underline">
            View All Events
          </button>
        </div>
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Time</th>
                <th className="text-left py-3 px-4 font-medium">Type</th>
                <th className="text-left py-3 px-4 font-medium">Severity</th>
                <th className="text-left py-3 px-4 font-medium">Source</th>
                <th className="text-left py-3 px-4 font-medium">User</th>
                <th className="text-left py-3 px-4 font-medium">Details</th>
                <th className="text-left py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentSecurityEvents.map((event, index) => (
                <tr key={index} className="border-t hover:bg-neutral-50">
                  <td className="py-3 px-4 text-sm">
                    {event.timestamp.toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs rounded bg-neutral-100 text-neutral-800">
                      {event.eventType.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        event.severity === "high"
                          ? "bg-red-100 text-red-800"
                          : event.severity === "medium"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {event.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-sm">
                    {event.ipAddress}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {event.user?.email || "Unknown"}
                  </td>
                  <td className="py-3 px-4 text-sm max-w-xs truncate">
                    {typeof event.details === "string"
                      ? event.details
                      : JSON.stringify(event.details)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="text-xs text-blue-600 hover:underline">
                        Investigate
                      </button>
                      <button className="text-xs text-red-600 hover:underline">
                        Block
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top Threats */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Top Security Threats</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {topThreats.map((threat, index) => (
            <div key={index} className="bg-white rounded-lg border p-4">
              <h3 className="font-medium text-sm">{threat.threat}</h3>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-semibold">{threat.count}</span>
                <span
                  className={`text-sm ${
                    threat.trend.startsWith("+")
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {threat.trend}
                </span>
              </div>
              <div className="mt-3">
                <button className="text-xs text-blue-600 hover:underline">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Configuration */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Security Configuration</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Rate Limiting */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-medium mb-4">Rate Limiting Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm">API Rate Limit (req/min)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    defaultValue="100"
                    className="w-16 text-sm border rounded px-2 py-1"
                  />
                  <span className="text-sm">per IP</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">Auth Rate Limit (req/min)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    defaultValue="10"
                    className="w-16 text-sm border rounded px-2 py-1"
                  />
                  <span className="text-sm">per IP</span>
                </div>
              </div>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">Auto-block violating IPs</span>
              </label>
            </div>
          </div>

          {/* IP Security */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-medium mb-4">IP Security Settings</h3>
            <div className="space-y-4">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">Block high-risk countries</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">Detect VPN/Proxy usage</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">Tor network blocking</span>
              </label>
              <div className="flex items-center justify-between">
                <label className="text-sm">Risk Score Threshold</label>
                <input
                  type="number"
                  defaultValue="75"
                  className="w-16 text-sm border rounded px-2 py-1"
                />
              </div>
            </div>
          </div>

          {/* CAPTCHA Settings */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-medium mb-4">CAPTCHA Configuration</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm">CAPTCHA Provider</label>
                <select className="text-sm border rounded px-2 py-1">
                  <option value="recaptcha">reCAPTCHA v3</option>
                  <option value="hcaptcha">hCaptcha</option>
                  <option value="turnstile">Cloudflare Turnstile</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">Score Threshold</label>
                <input
                  type="number"
                  step="0.1"
                  defaultValue="0.5"
                  className="w-16 text-sm border rounded px-2 py-1"
                />
              </div>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">Adaptive CAPTCHA based on risk</span>
              </label>
            </div>
          </div>

          {/* MFA Settings */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-medium mb-4">Multi-Factor Authentication</h3>
            <div className="space-y-4">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">Enforce MFA for admin users</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm">Require MFA for all users</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">Allow backup codes</span>
              </label>
              <div className="flex items-center justify-between">
                <label className="text-sm">Backup codes count</label>
                <input
                  type="number"
                  defaultValue="10"
                  className="w-16 text-sm border rounded px-2 py-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            Save Security Settings
          </button>
        </div>
      </section>

      {/* Security Tools */}
      <section className="bg-neutral-50 rounded-lg p-6">
        <h3 className="font-medium mb-4">Security Tools</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <button className="bg-white border rounded-lg p-4 text-left hover:bg-neutral-50">
            <h4 className="font-medium text-sm">IP Blacklist Manager</h4>
            <p className="text-xs text-neutral-600 mt-1">
              Manage blocked IP addresses
            </p>
          </button>
          <button className="bg-white border rounded-lg p-4 text-left hover:bg-neutral-50">
            <h4 className="font-medium text-sm">Security Report</h4>
            <p className="text-xs text-neutral-600 mt-1">
              Generate comprehensive security analysis
            </p>
          </button>
          <button className="bg-white border rounded-lg p-4 text-left hover:bg-neutral-50">
            <h4 className="font-medium text-sm">Incident Response</h4>
            <p className="text-xs text-neutral-600 mt-1">
              Manage security incidents
            </p>
          </button>
          <button className="bg-white border rounded-lg p-4 text-left hover:bg-neutral-50">
            <h4 className="font-medium text-sm">Audit Logs</h4>
            <p className="text-xs text-neutral-600 mt-1">
              View detailed security audit trail
            </p>
          </button>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  color,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: "red" | "orange" | "green" | "blue" | "yellow" | "purple";
  trend: string;
}) {
  const colorClasses = {
    red: "bg-red-50 border-red-200",
    orange: "bg-orange-50 border-orange-200",
    green: "bg-green-50 border-green-200",
    blue: "bg-blue-50 border-blue-200",
    yellow: "bg-yellow-50 border-yellow-200",
    purple: "bg-purple-50 border-purple-200",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium text-neutral-600">{title}</h3>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
      <p className="text-xs text-neutral-400 mt-1">{trend}</p>
    </div>
  );
}
