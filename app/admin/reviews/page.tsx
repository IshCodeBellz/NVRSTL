import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { ReviewModeration } from "@/components/admin/ReviewModeration";

export default async function AdminReviewsPage() {
  const session = await getServerSession(authOptionsEnhanced);

  // Check if user is authenticated and is admin
  if (!session?.user || !session.user.isAdmin) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ReviewModeration />
      </div>
    </div>
  );
}
