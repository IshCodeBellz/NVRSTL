"use client";

import { useState, useEffect, useCallback } from "react";
import { ReviewDisplay } from "./ReviewDisplay";
import { ReviewForm } from "./ReviewForm";
import { useSession } from "next-auth/react";

interface Review {
  id: string;
  productId: string;
  userId: string | null;
  userName: string;
  userAvatar?: string;
  rating: number;
  title?: string | null;
  content: string;
  images: string[];
  videos: string[];
  isVerified: boolean;
  helpfulVotes: number;
  reportCount: number;
  isModerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<
    Record<string, number>
  >({});

  const fetchReviews = useCallback(
    async (pageNum = 1, reset = false) => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/products/${productId}/reviews?page=${pageNum}&limit=10&includeAnalytics=true`
        );

        if (response.ok) {
          const data = await response.json();

          if (reset || pageNum === 1) {
            setReviews(data.reviews);
          } else {
            setReviews((prev) => [...prev, ...data.reviews]);
          }

          setTotalCount(data.totalCount);
          setAverageRating(data.averageRating);
          setRatingDistribution(data.ratingDistribution);
          setHasMore(data.hasMore);
          setPage(pageNum);
        }
      } catch (error) {
        
        
      } finally {
        setLoading(false);
      }
    },
    [productId]
  );

  useEffect(() => {
    fetchReviews(1, true);
  }, [productId, fetchReviews]);

  const handleReviewSubmitted = () => {
    setShowForm(false);
    fetchReviews(1, true); // Refresh reviews after submission
  };

  const handleLoadMore = () => {
    fetchReviews(page + 1);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
        {session && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Write a Review
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <ReviewForm
              productId={productId}
              productName="Product" // We could fetch this if needed
              onReviewSubmitted={handleReviewSubmitted}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      <ReviewDisplay
        reviews={reviews}
        totalCount={totalCount}
        averageRating={averageRating}
        ratingDistribution={ratingDistribution}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loading={loading}
      />
    </div>
  );
}
