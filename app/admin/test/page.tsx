import { prisma } from "@/lib/server/prisma";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import Link from "next/link";

export default async function AdminTestPage() {
  const session = await getServerSession(authOptionsEnhanced);

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Not Authenticated
          </h1>
          <p>Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isAdmin: true,
      emailVerified: true,
    },
  });

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p>You do not have admin privileges.</p>
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold">User Info:</h3>
            <p>Email: {session.user.email}</p>
            <p>ID: {session.user.id}</p>
            <p>Admin: {user?.isAdmin ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl">
        <h1 className="text-3xl font-bold text-green-600 mb-6">
          ✅ Admin Access Confirmed
        </h1>

        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <h2 className="text-xl font-semibold text-green-800 mb-2">
              Authentication Status
            </h2>
            <p className="text-green-700">
              ✅ Successfully authenticated as admin
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-800 mb-2">
              User Details
            </h2>
            <div className="space-y-2 text-blue-700">
              <p>
                <strong>Name:</strong> {user.firstName} {user.lastName}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>User ID:</strong> {user.id}
              </p>
              <p>
                <strong>Admin Status:</strong>{" "}
                {user.isAdmin ? "✅ Yes" : "❌ No"}
              </p>
              <p>
                <strong>Email Verified:</strong>{" "}
                {user.emailVerified ? "✅ Yes" : "❌ No"}
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Session Info
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>Session User ID:</strong> {session.user.id}
              </p>
              <p>
                <strong>Session Email:</strong> {session.user.email}
              </p>
              <p>
                <strong>Session Admin:</strong>{" "}
                {(session.user as any).isAdmin ? "✅ Yes" : "❌ No"}
              </p>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Link
              href="/admin"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Go to Admin Dashboard
            </Link>
            <Link
              href="/admin/cms"
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors"
            >
              Go to CMS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
