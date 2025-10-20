import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import Link from "next/link";

export const revalidate = 30; // Refresh every 30 seconds for real-time updates

export default async function UsersPage() {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = session?.user?.id;
  if (!uid) redirect("/login?callbackUrl=/admin/users");

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.isAdmin) redirect("/");

  // Get real user data from the database
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 50, // Limit for performance
  });

  const userStats = {
    totalUsers: await prisma.user.count(),
    adminUsers: await prisma.user.count({ where: { isAdmin: true } }),
    verifiedUsers: await prisma.user.count({ where: { emailVerified: true } }),
    mfaUsers: await prisma.user.count({ where: { mfaEnabled: true } }),
    lockedUsers: await prisma.user.count({
      where: { lockedAt: { not: null } },
    }),
    recentRegistrations: await prisma.user.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  interface User {
    lockedAt?: Date | null;
    emailVerified?: boolean;
    isAdmin?: boolean;
  }

  const getUserStatus = (user: User) => {
    if (user.lockedAt) return { label: "Locked", color: "red" };
    if (!user.emailVerified) return { label: "Unverified", color: "yellow" };
    if (user.isAdmin) return { label: "Admin", color: "purple" };
    return { label: "Active", color: "green" };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
          >
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            User Management
          </h1>
        </div>
        <p className="text-neutral-600 dark:text-neutral-400">
          Manage user accounts, roles, and activity monitoring
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Total Users
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {userStats.totalUsers.toLocaleString()}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Admin Users
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {userStats.adminUsers}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Verified
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {userStats.verifiedUsers}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                MFA Enabled
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {userStats.mfaUsers}
              </p>
            </div>
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Locked
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {userStats.lockedUsers}
              </p>
            </div>
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                New (7 days)
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {userStats.recentRegistrations}
              </p>
            </div>
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-orange-600 dark:text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border dark:border-neutral-700 overflow-hidden">
        <div className="px-6 py-4 border-b dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Recent Users
            </h2>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Export Users
              </button>
              <button className="px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                Filter
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  MFA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
              {users.map((user) => {
                const status = getUserStatus(user);
                return (
                  <tr
                    key={user.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8">
                          <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                              {user.name
                                ? user.name[0].toUpperCase()
                                : user.email[0].toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-neutral-900 dark:text-white">
                            {user.name || "No name"}
                          </div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          status.color === "green"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : status.color === "yellow"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                            : status.color === "red"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                        }`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                      {user.isAdmin ? "Administrator" : "User"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.mfaEnabled ? (
                        <span className="text-green-600 dark:text-green-400">
                          ✓ Enabled
                        </span>
                      ) : (
                        <span className="text-neutral-400">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                      {user.lastLoginAt
                        ? formatDate(user.lastLoginAt)
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                          Edit
                        </button>
                        {user.lockedAt ? (
                          <button className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300">
                            Unlock
                          </button>
                        ) : (
                          <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
                            Lock
                          </button>
                        )}
                        <button className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-300">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="px-6 py-12 text-center">
            <svg
              className="w-12 h-12 text-neutral-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              No users found
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              No users have been registered yet.
            </p>
          </div>
        )}
      </div>

      {/* User Activity Monitoring Section */}
      <div className="mt-8 bg-white dark:bg-neutral-800 rounded-lg border dark:border-neutral-700 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          User Activity Monitoring
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-neutral-50 dark:bg-neutral-700 p-4 rounded-lg">
            <h3 className="font-medium text-neutral-900 dark:text-white mb-2">
              Real-time Activity
            </h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              23
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Users online now
            </p>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-700 p-4 rounded-lg">
            <h3 className="font-medium text-neutral-900 dark:text-white mb-2">
              Failed Logins (24h)
            </h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              12
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Security incidents
            </p>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-700 p-4 rounded-lg">
            <h3 className="font-medium text-neutral-900 dark:text-white mb-2">
              Average Session
            </h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              24m
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Session duration
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
