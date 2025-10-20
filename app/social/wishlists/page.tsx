import { Suspense } from "react";
import SocialWishlistDashboard from "../../../components/social/SocialWishlistDashboard";

export default function SocialWishlistPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Suspense
        fallback={
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-neutral-200 rounded w-1/3"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-neutral-200 rounded-lg h-48"></div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <SocialWishlistDashboard />
      </Suspense>
    </div>
  );
}
