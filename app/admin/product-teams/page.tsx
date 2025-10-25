import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProductTeamManager } from "./ProductTeamManager";

export const dynamic = "force-dynamic";

export default async function ProductTeamsPage() {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = (session?.user as { id: string })?.id;
  if (!uid) redirect("/login?callbackUrl=/admin/product-teams");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Product-Team Management
              </h1>
              <p className="text-gray-600 mt-1">
                Link products to shop teams for dynamic shop pages
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="text-sm rounded bg-neutral-200 text-neutral-900 px-3 py-2 hover:bg-neutral-300"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/admin/products"
                className="text-sm rounded bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
              >
                Manage Products
              </Link>
            </div>
          </div>
        </div>

        {/* Product Team Manager */}
        <ProductTeamManager />
      </div>
    </div>
  );
}
