import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import { ReviewService } from "@/lib/server/reviewService";
import { SocialWishlistService } from "@/lib/server/socialWishlistService";
import Link from "next/link";

export const revalidate = 60;

export default async function SocialPage() {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = session?.user?.id;
  if (!uid) redirect("/login?callbackUrl=/admin/social");

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.isAdmin) redirect("/");

  const reviewService = new ReviewService();
  const wishlistService = new SocialWishlistService();

  // Get social commerce data
  const [pendingReviews, reportedContent, socialStats, recentActivity] =
    await Promise.all([
      reviewService.getPendingModerationReviews(),
      reviewService.getReportedContent(),
      reviewService.getSocialStats(),
      wishlistService.getRecentActivity(),
    ]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Social Commerce
          </h1>
          <p className="text-neutral-600 mt-2">
            Moderate reviews, manage wishlists, and monitor social features
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm rounded bg-neutral-200 text-neutral-900 px-3 py-2 hover:bg-neutral-300"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Social Stats */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Reviews"
          value={socialStats.pendingReviews.toString()}
          subtitle="Awaiting moderation"
          color="orange"
        />
        <StatCard
          title="Reported Content"
          value={socialStats.reportedContent.toString()}
          subtitle="Requires review"
          color="red"
        />
        <StatCard
          title="Public Wishlists"
          value={socialStats.publicWishlists.toLocaleString()}
          subtitle="Shared by users"
          color="blue"
        />
        <StatCard
          title="Review Engagement"
          value={`${socialStats.reviewEngagement}%`}
          subtitle="Helpful votes"
          color="green"
        />
      </section>

      {/* Pending Reviews Moderation */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Reviews Awaiting Moderation</h2>
          <div className="flex gap-2">
            <button className="text-sm text-green-600 hover:underline">
              Approve All Valid
            </button>
            <button className="text-sm text-blue-600 hover:underline">
              Moderation Settings
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Review</th>
                <th className="text-left py-3 px-4 font-medium">Product</th>
                <th className="text-left py-3 px-4 font-medium">User</th>
                <th className="text-left py-3 px-4 font-medium">Rating</th>
                <th className="text-left py-3 px-4 font-medium">Media</th>
                <th className="text-left py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingReviews.map((review, index) => (
                <tr key={index} className="border-t hover:bg-neutral-50">
                  <td className="py-3 px-4 max-w-xs">
                    <div className="text-sm">{review.comment}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium">
                      {review.productName}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {review.productSku}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">{review.userName}</div>
                    <div className="text-xs text-neutral-500">
                      Verified: {review.verified ? "Yes" : "No"}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-sm ${
                            i < review.rating
                              ? "text-yellow-400"
                              : "text-neutral-300"
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      {review.hasPhotos && (
                        <span className="text-blue-600">📷 Photos</span>
                      )}
                      {review.hasVideos && (
                        <span className="text-purple-600 ml-1">🎥 Videos</span>
                      )}
                      {!review.hasPhotos && !review.hasVideos && (
                        <span className="text-neutral-400">None</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="text-xs text-green-600 hover:underline">
                        Approve
                      </button>
                      <button className="text-xs text-red-600 hover:underline">
                        Reject
                      </button>
                      <button className="text-xs text-blue-600 hover:underline">
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reported Content */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold dark:text-white">
          Reported Content
        </h2>
        <div className="bg-white dark:bg-neutral-800 rounded-lg border dark:border-neutral-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-700">
              <tr>
                <th className="text-left py-3 px-4 font-medium dark:text-white">
                  Content
                </th>
                <th className="text-left py-3 px-4 font-medium dark:text-white">
                  Type
                </th>
                <th className="text-left py-3 px-4 font-medium dark:text-white">
                  Reports
                </th>
                <th className="text-left py-3 px-4 font-medium dark:text-white">
                  Reason
                </th>
                <th className="text-left py-3 px-4 font-medium dark:text-white">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium dark:text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {reportedContent.map((report, index) => (
                <tr
                  key={index}
                  className="border-t dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                >
                  <td className="py-3 px-4 max-w-xs">
                    <div className="text-sm truncate dark:text-white">
                      {report.content}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      By: {report.authorName}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs rounded bg-neutral-100 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-200">
                      {report.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium dark:text-white">
                      {report.reportCount}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {report.reasons.join(", ")}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        report.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : report.status === "resolved"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="text-xs text-blue-600 hover:underline">
                        Investigate
                      </button>
                      <button className="text-xs text-red-600 hover:underline">
                        Remove
                      </button>
                      <button className="text-xs text-green-600 hover:underline">
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Social Activity */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Social Activity</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-medium mb-3">Wishlist Activity</h3>
            <div className="space-y-3">
              {recentActivity.wishlists.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-medium">{activity.userName}</span>
                    <span className="text-neutral-600">
                      {" "}
                      {activity.action}{" "}
                    </span>
                    <span className="text-blue-600">
                      &quot;{activity.wishlistName}&quot;
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-medium mb-3">Review Interactions</h3>
            <div className="space-y-3">
              {recentActivity.reviews.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-medium">{activity.userName}</span>
                    <span className="text-neutral-600">
                      {" "}
                      {activity.action}{" "}
                    </span>
                    <span className="text-green-600">★{activity.rating}</span>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Moderation Tools */}
      <section className="bg-neutral-50 rounded-lg p-6">
        <h3 className="font-medium mb-4">Moderation Tools</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <button className="bg-white border rounded-lg p-4 text-left hover:bg-neutral-50">
            <h4 className="font-medium text-sm">Auto-Moderation Rules</h4>
            <p className="text-xs text-neutral-600 mt-1">
              Configure automatic content filtering
            </p>
          </button>
          <button className="bg-white border rounded-lg p-4 text-left hover:bg-neutral-50">
            <h4 className="font-medium text-sm">Banned Words List</h4>
            <p className="text-xs text-neutral-600 mt-1">
              Manage prohibited content
            </p>
          </button>
          <button className="bg-white border rounded-lg p-4 text-left hover:bg-neutral-50">
            <h4 className="font-medium text-sm">User Warnings</h4>
            <p className="text-xs text-neutral-600 mt-1">
              Send notifications to users
            </p>
          </button>
          <button className="bg-white border rounded-lg p-4 text-left hover:bg-neutral-50">
            <h4 className="font-medium text-sm">Moderation Log</h4>
            <p className="text-xs text-neutral-600 mt-1">
              View all moderation actions
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
}: {
  title: string;
  value: string;
  subtitle: string;
  color: "blue" | "orange" | "red" | "green";
}) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200",
    orange: "bg-orange-50 border-orange-200",
    red: "bg-red-50 border-red-200",
    green: "bg-green-50 border-green-200",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium text-neutral-600">{title}</h3>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
    </div>
  );
}
