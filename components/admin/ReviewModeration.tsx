"use client";

import { useState, useEffect } from "react";
import {
  Eye,
  Check,
  X,
  Trash2,
  Star,
  RefreshCw,
  Filter,
  Search,
} from "lucide-react";

interface ModerationReview {
  id: string;
  productId: string;
  userId: string;
  content: string;
  rating: number;
  authorName: string;
  productName: string;
  flagReason: string;
  reportCount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

export function ReviewModeration() {
  const [reviews, setReviews] = useState<ModerationReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [filter, setFilter] = useState<"all" | "pending" | "reported">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchModerationQueue = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/reviews/moderation-queue");
      const data = await response.json();

      if (response.ok) {
        setReviews(data.queue || []);
      } else {
        
      }
    } catch (error) {
      
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationQueue();
  }, []);

  const handleModerationAction = async (
    reviewId: string,
    action: "approve" | "reject" | "delete"
  ) => {
    setActionLoading((prev) => ({ ...prev, [reviewId]: true }));

    try {
      const response = await fetch("/api/admin/reviews/moderation-queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewId, action }),
      });

      const data = await response.json();

      if (response.ok) {
        // Remove the review from the list or update its status
        if (action === "delete") {
          setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        } else {
          setReviews((prev) =>
            prev.map((r) =>
              r.id === reviewId
                ? {
                    ...r,
                    status: action === "approve" ? "approved" : "rejected",
                  }
                : r
            )
          );
        }

        // Show success message
        alert(`Review ${action}d successfully`);
      } else {
        alert(`Failed to ${action} review: ${data.error}`);
      }
    } catch (error) {
      
      
      alert(`Failed to ${action} review`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">{rating}/5</span>
      </div>
    );
  };

  const getStatusBadge = (status: string, reportCount: number) => {
    if (status === "approved") {
      return (
        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
          Approved
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
          Rejected
        </span>
      );
    }
    if (reportCount > 0) {
      return (
        <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
          Reported ({reportCount})
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
        Pending
      </span>
    );
  };

  const getFlagReasonBadge = (reason: string) => {
    const reasonMap: Record<string, { label: string; color: string }> = {
      auto_hidden: { label: "Auto Hidden", color: "bg-red-100 text-red-800" },
      user_reports: {
        label: "User Reports",
        color: "bg-orange-100 text-orange-800",
      },
      pending_review: {
        label: "Pending Review",
        color: "bg-yellow-100 text-yellow-800",
      },
    };

    const reasonInfo = reasonMap[reason] || {
      label: reason,
      color: "bg-gray-100 text-gray-800",
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${reasonInfo.color}`}>
        {reasonInfo.label}
      </span>
    );
  };

  const filteredReviews = reviews.filter((review) => {
    // Apply status filter
    if (filter === "pending" && review.status !== "pending") return false;
    if (filter === "reported" && review.reportCount === 0) return false;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        review.content.toLowerCase().includes(searchLower) ||
        review.authorName.toLowerCase().includes(searchLower) ||
        review.productName.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Review Moderation
          </h2>
          <p className="text-gray-600">Manage and moderate customer reviews</p>
        </div>
        <button
          onClick={fetchModerationQueue}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as "all" | "pending" | "reported")
            }
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="all">All Reviews</option>
            <option value="pending">Pending Only</option>
            <option value="reported">Reported Only</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm w-64"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">
            {reviews.length}
          </div>
          <div className="text-sm text-gray-600">Total Reviews</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-yellow-600">
            {reviews.filter((r) => r.status === "pending").length}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-orange-600">
            {reviews.filter((r) => r.reportCount > 0).length}
          </div>
          <div className="text-sm text-gray-600">Reported</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">
            {reviews.filter((r) => r.status === "approved").length}
          </div>
          <div className="text-sm text-gray-600">Approved</div>
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-12">
          <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No reviews to moderate
          </h3>
          <p className="text-gray-500">
            All reviews have been processed or no reviews match your filters.
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredReviews.map((review) => (
              <div key={review.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-medium text-gray-900">
                        {review.authorName}
                      </span>
                      {renderStars(review.rating)}
                      {getStatusBadge(review.status, review.reportCount)}
                      {getFlagReasonBadge(review.flagReason)}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      Product:{" "}
                      <span className="font-medium">{review.productName}</span>
                      {" • "}
                      <span>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-700">{review.content}</p>
                </div>

                {review.status === "pending" && (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() =>
                        handleModerationAction(review.id, "approve")
                      }
                      disabled={actionLoading[review.id]}
                      className="flex items-center px-3 py-1 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() =>
                        handleModerationAction(review.id, "reject")
                      }
                      disabled={actionLoading[review.id]}
                      className="flex items-center px-3 py-1 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to delete this review? This action cannot be undone."
                          )
                        ) {
                          handleModerationAction(review.id, "delete");
                        }
                      }}
                      disabled={actionLoading[review.id]}
                      className="flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </div>
                )}

                {actionLoading[review.id] && (
                  <div className="mt-2 text-sm text-gray-500">
                    Processing...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
