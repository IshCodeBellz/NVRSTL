import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import { PersonalizationService } from "@/lib/server/personalizationService";
import Link from "next/link";

export const revalidate = 60;

export default async function PersonalizationPage() {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = (session?.user as { id: string })?.id;
  if (!uid) redirect("/login?callbackUrl=/admin/personalization");

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.isAdmin) redirect("/");

  const personalizationService = new PersonalizationService();

  // Get personalization analytics
  const [algorithmStats, userSegments, recommendationStats] = await Promise.all(
    [
      personalizationService.getAlgorithmPerformance(),
      personalizationService.getUserSegments(),
      personalizationService.getRecommendationStats(),
    ]
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Personalization Engine
          </h1>
          <p className="text-neutral-600 mt-2">
            Configure and monitor AI recommendation algorithms
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm rounded bg-neutral-200 text-neutral-900 px-3 py-2 hover:bg-neutral-300"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Algorithm Performance */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Algorithm Performance</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {algorithmStats.map((algo, index) => (
            <div key={index} className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-lg">{algo.name}</h3>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    algo.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-neutral-100 text-neutral-800"
                  }`}
                >
                  {algo.status}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Click Rate</span>
                  <span className="font-medium">{algo.clickRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Conversion</span>
                  <span className="font-medium">{algo.conversionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Coverage</span>
                  <span className="font-medium">{algo.coverage}%</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <button className="text-sm text-blue-600 hover:underline">
                  Configure Settings
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* User Segments */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">User Segments</h2>
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Segment</th>
                <th className="text-left py-3 px-4 font-medium">Users</th>
                <th className="text-left py-3 px-4 font-medium">
                  Avg Order Value
                </th>
                <th className="text-left py-3 px-4 font-medium">Engagement</th>
                <th className="text-left py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {userSegments.map((segment, index) => (
                <tr key={index} className="border-t hover:bg-neutral-50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{segment.name}</div>
                      <div className="text-sm text-neutral-500">
                        {segment.description}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {segment.userCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">${segment.avgOrderValue}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className="w-16 bg-neutral-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${segment.engagementScore}%` }}
                        ></div>
                      </div>
                      <span className="text-sm">
                        {segment.engagementScore}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button className="text-sm text-blue-600 hover:underline">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recommendation Stats */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recommendation Statistics</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Daily Recommendations"
            value={recommendationStats.dailyRecommendations.toLocaleString()}
            trend="+18% from yesterday"
          />
          <MetricCard
            title="Click-through Rate"
            value={`${recommendationStats.clickThroughRate}%`}
            trend="+5% from last week"
          />
          <MetricCard
            title="Revenue Attribution"
            value={`$${recommendationStats.revenueAttribution.toLocaleString()}`}
            trend="+23% from last week"
          />
          <MetricCard
            title="User Coverage"
            value={`${recommendationStats.userCoverage}%`}
            trend="+2% from last week"
          />
        </div>
      </section>

      {/* Configuration Panel */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">System Configuration</h2>
        <div className="bg-white rounded-lg border p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="font-medium">Algorithm Weights</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Collaborative Filtering</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="40"
                      className="w-20"
                    />
                    <span className="text-sm w-8">40%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Content-Based</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="35"
                      className="w-20"
                    />
                    <span className="text-sm w-8">35%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Trending Boost</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="25"
                      className="w-20"
                    />
                    <span className="text-sm w-8">25%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-medium">System Settings</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">
                    Enable real-time recommendations
                  </span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">Use browsing history</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">
                    Enable cross-category suggestions
                  </span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">Debug mode</span>
                </label>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t">
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Save Configuration
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  trend,
}: {
  title: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-medium text-neutral-600">{title}</h3>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{trend}</p>
    </div>
  );
}
