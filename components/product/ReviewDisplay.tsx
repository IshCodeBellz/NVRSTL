"use client";

import { useState } from "react";
import { Star, ThumbsUp, Flag, ChevronDown, ChevronUp } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
// Simple time ago function to avoid external dependency
const timeAgo = (date: Date) => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  } else if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

interface Review {
  id: string;
  productId: string;
  userId: string | null;
  userName: string | null;
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

interface ReviewDisplayProps {
  reviews?: Review[];
  totalCount: number;
  averageRating: number;
  ratingDistribution?: Record<string, number>;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
}

export function ReviewDisplay({
  reviews = [],
  totalCount,
  averageRating,
  ratingDistribution = {},
  onLoadMore,
  hasMore = false,
  loading = false,
}: ReviewDisplayProps) {
  const { data: session } = useSession();
  const [votingStates, setVotingStates] = useState<Record<string, boolean>>({});
  const [reportingStates, setReportingStates] = useState<
    Record<string, boolean>
  >({});
  const [expandedReviews, setExpandedReviews] = useState<
    Record<string, boolean>
  >({});

  const handleVoteHelpful = async (reviewId: string) => {
    if (!session) {
      alert("Please log in to vote on reviews");
      return;
    }

    if (votingStates[reviewId]) return;

    setVotingStates((prev) => ({ ...prev, [reviewId]: true }));

    try {
      const response = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to vote");
      }

      // In a real app, you'd update the local state with the new vote count
      // For now, we'll just show a success message
      alert("Thanks for your feedback!");
    } catch (error) {
      
      
      alert(error instanceof Error ? error.message : "Failed to vote");
    } finally {
      setVotingStates((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleReport = async (reviewId: string, reason: string) => {
    if (!session) {
      alert("Please log in to report reviews");
      return;
    }

    if (reportingStates[reviewId]) return;

    setReportingStates((prev) => ({ ...prev, [reviewId]: true }));

    try {
      const response = await fetch(`/api/reviews/${reviewId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to report");
      }

      alert("Review reported. Thank you for helping maintain quality.");
    } catch (error) {
      
      
      alert(error instanceof Error ? error.message : "Failed to report");
    } finally {
      setReportingStates((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const toggleExpanded = (reviewId: string) => {
    setExpandedReviews((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  const renderStars = (rating: number, size: "sm" | "md" = "sm") => {
    const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";

    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const renderRatingDistribution = () => {
    const total = Object.values(ratingDistribution || {}).reduce(
      (sum, count) => sum + count,
      0
    );

    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = (ratingDistribution && ratingDistribution[rating]) || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={rating} className="flex items-center text-sm">
              <span className="w-8">{rating}</span>
              <Star className="w-3 h-3 text-yellow-400 fill-current mr-2" />
              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-8 text-right text-gray-600">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No reviews yet
        </h3>
        <p className="text-gray-500">
          Be the first to share your thoughts about this product.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {averageRating ? averageRating.toFixed(1) : "0.0"}
            </div>
            {renderStars(Math.round(averageRating || 0), "md")}
            <div className="text-sm text-gray-600 mt-2">
              Based on {totalCount} review{totalCount !== 1 ? "s" : ""}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Rating Distribution
            </h4>
            {renderRatingDistribution()}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((review) => {
          const isExpanded = expandedReviews[review.id];
          const content =
            typeof review.content === "string" ? review.content : "";
          const shouldTruncate = content.length > 300;
          const displayContent =
            shouldTruncate && !isExpanded
              ? content.slice(0, 300) + "..."
              : content;

          return (
            <div key={review.id} className="border-b border-gray-200 pb-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {review.userName
                        ? review.userName.charAt(0).toUpperCase()
                        : "?"}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {review.userName || "Anonymous"}
                      </span>
                      {review.isVerified && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      {renderStars(review.rating)}
                      <span className="text-xs text-gray-500">
                        {timeAgo(new Date(review.createdAt))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {review.title && (
                <h4 className="font-medium text-gray-900 mb-2">
                  {review.title}
                </h4>
              )}

              <p className="text-gray-700 mb-4">{displayContent}</p>

              {shouldTruncate && (
                <button
                  onClick={() => toggleExpanded(review.id)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center mb-3"
                >
                  {isExpanded ? (
                    <>
                      Show less <ChevronUp className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              )}

              {review.images && review.images.length > 0 && (
                <div className="flex space-x-2 mb-4">
                  {review.images.map((image, index) => (
                    <Image
                      key={index}
                      src={image}
                      alt={`Review image ${index + 1}`}
                      width={64}
                      height={64}
                      className="w-16 h-16 object-cover rounded-md border"
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleVoteHelpful(review.id)}
                    disabled={
                      votingStates[review.id] ||
                      review.userId === session?.user?.id
                    }
                    className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Helpful ({review.helpfulVotes})</span>
                  </button>
                </div>

                {session && review.userId !== session.user?.id && (
                  <button
                    onClick={() => {
                      const reason = prompt(
                        "Why are you reporting this review?"
                      );
                      if (reason) {
                        handleReport(review.id, "other");
                      }
                    }}
                    disabled={reportingStates[review.id]}
                    className="flex items-center space-x-1 text-sm text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Flag className="w-4 h-4" />
                    <span>Report</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Load More Reviews"}
          </button>
        </div>
      )}
    </div>
  );
}
