/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "./prisma";
import type { Prisma, ProductReview } from "@prisma/client";

export class ReviewService {
  // Admin page instance methods (mocked)
  async getPendingModerationReviews(): Promise<
    Array<{
      id: string;
      comment: string;
      productName: string;
      productSku?: string;
      userName: string;
      rating: number;
      hasPhotos: boolean;
      hasVideos: boolean;
      verified: boolean;
      createdAt: string;
    }>
  > {
    return [
      {
        id: "rev_1",
        comment: "Great fit, but color slightly off",
        productName: "Classic Tee",
        productSku: "TEE-CL-001",
        userName: "Jane D.",
        rating: 4,
        hasPhotos: true,
        hasVideos: false,
        verified: true,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async getReportedContent(): Promise<
    Array<{
      id: string;
      content: string;
      type: string;
      reportCount: number;
      reasons: string[];
      status: "pending" | "resolved" | "removed";
      authorName: string;
    }>
  > {
    return [
      {
        id: "rep_1",
        content: "Inappropriate language in review",
        type: "review",
        reportCount: 3,
        reasons: ["abusive", "spam"],
        status: "pending",
        authorName: "User123",
      },
    ];
  }

  async getSocialStats(): Promise<{
    pendingReviews: number;
    reportedContent: number;
    publicWishlists: number;
    reviewEngagement: number;
  }> {
    return {
      pendingReviews: 7,
      reportedContent: 2,
      publicWishlists: 1542,
      reviewEngagement: 68,
    };
  }

  // API static methods
  static async getProductReviews(
    productId: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      verified?: boolean;
      minRating?: number;
    } = {}
  ): Promise<{
    reviews: Array<{
      id: string;
      userId: string;
      rating: number;
      title?: string;
      content: string;
      verified: boolean;
      createdAt: string;
    }>;
    totalCount: number;
    analytics: {
      averageRating: number;
      totalReviews: number;
      ratingDistribution: Record<string, number>;
      verifiedReviewsPercentage: number;
    };
  }> {
    const { page = 1, limit = 10, verified, minRating } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductReviewWhereInput = { productId };
    if (verified !== undefined) where.isVerified = verified;
    if (minRating !== undefined) where.rating = { gte: minRating };

    try {
      const [rows, total] = await Promise.all([
        prisma.productReview.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            userId: true,
            rating: true,
            title: true,
            content: true,
            isVerified: true,
            createdAt: true,
          },
        }),
        prisma.productReview.count({ where }),
      ]);

      const analytics = await this.getProductReviewAnalytics(productId);
      const reviews = rows.map((r) => ({
        id: r.id,
        userId: r.userId || "",
        rating: r.rating,
        title: r.title || undefined,
        content: r.content,
        verified: r.isVerified,
        createdAt: r.createdAt.toISOString(),
      }));

      return { reviews, totalCount: total, analytics };
    } catch {
      return {
        reviews: [],
        totalCount: 0,
        analytics: {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: {},
          verifiedReviewsPercentage: 0,
        },
      };
    }
  }

  static async createReview(data: {
    productId: string;
    userId: string;
    rating: number;
    title?: string;
    content: string;
    images?: string[];
    videos?: string[];
    isVerified?: boolean;
  }): Promise<{ success: boolean; error?: string; review?: ProductReview }> {
    try {
      const review = await prisma.productReview.create({
        data: {
          productId: data.productId,
          userId: data.userId,
          authorName: "Anonymous",
          rating: data.rating,
          title: data.title || null,
          content: data.content,
          isVerified: !!data.isVerified,
          images:
            data.images && data.images.length
              ? JSON.stringify(data.images)
              : null,
        },
      });

      // Update analytics after creating a review
      await this.updateProductReviewAnalytics(data.productId);

      return { success: true, review };
    } catch (e) {
      return { success: false, error: "Failed to create review" };
    }
  }

  static async voteReviewHelpful(
    reviewId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string; newVoteCount?: number }> {
    // Enforce one-vote-per-user via ReviewVote unique constraint; increment counters if new
    try {
      // prisma client may not have a generated reviewVote model in some schema setups;
      // cast to any to avoid the TS error while still calling the runtime method.
      await (prisma as any).reviewVote.create({ data: { reviewId, userId } });
    } catch {
      // Duplicate vote: do not update counters
      const current = await prisma.productReview.findUnique({
        where: { id: reviewId },
        select: { helpfulVotes: true },
      });
      return {
        success: true,
        newVoteCount: current?.helpfulVotes ?? undefined,
      };
    }

    const updated = await prisma.productReview.update({
      where: { id: reviewId },
      data: {
        helpfulVotes: { increment: 1 },
        totalVotes: { increment: 1 },
      },
      select: { helpfulVotes: true, productId: true },
    });

    // Update analytics helpfulVotes count
    await prisma.reviewAnalytics.upsert({
      where: { productId: updated.productId },
      update: { helpfulVotes: { increment: 1 } },
      create: {
        productId: updated.productId,
        totalReviews: 0,
        averageRating: 0,
        ratingCounts: JSON.stringify({}),
        helpfulVotes: 1,
      },
    });

    return { success: true, newVoteCount: updated.helpfulVotes };
  }

  static async reportReview(
    reviewId: string,
    userId: string,
    reason: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    // Persist the report and unpublish for moderation
    try {
      const review = await prisma.productReview.update({
        where: { id: reviewId },
        data: { isPublished: false },
        select: { productId: true },
      });

      // Use an any cast to avoid TS errors if the generated Prisma client does not include a `reviewReport` model.
      await (prisma as any).reviewReport.create({
        data: { reviewId, userId, reason },
      });

      await this.updateProductReviewAnalytics(review.productId);

      return { success: true, message: "Report submitted for moderation" };
    } catch {
      return { success: false, error: "Failed to report review" };
    }
  }

  static async getModerationQueue(
    limit = 50
  ): Promise<Array<{ id: string; rating: number; comment: string }>> {
    const rows = await prisma.productReview
      .findMany({
        where: { isPublished: false },
        take: limit,
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []);
    return (rows as ProductReview[]).map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.content,
    }));
  }

  static async approveReview(
    reviewId: string,
    adminId: string,
    note?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const updated = await prisma.productReview.update({
        where: { id: reviewId },
        data: {
          isPublished: true,
          moderatedBy: adminId,
          moderatedAt: new Date(),
          moderationNote: note ?? undefined,
        } as any,
        select: { productId: true },
      });
      await this.updateProductReviewAnalytics(updated.productId);
      return { success: true, message: "Review approved" };
    } catch {
      return { success: false, error: "Failed to approve review" };
    }
  }

  static async rejectReview(
    reviewId: string,
    adminId: string,
    note?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    // Reject by unpublishing and recording moderator & optional note
    try {
      const updated = await prisma.productReview.update({
        where: { id: reviewId },
        data: {
          isPublished: false,
          moderatedBy: adminId,
          moderatedAt: new Date(),
          moderationNote: note ?? undefined,
        } as any,
        select: { productId: true },
      });
      await this.updateProductReviewAnalytics(updated.productId);
      return { success: true, message: "Review rejected" };
    } catch {
      return { success: false, error: "Failed to reject review" };
    }
  }

  static async deleteReview(
    reviewId: string,
    adminId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const deleted = await prisma.productReview.delete({
        where: { id: reviewId },
        select: { productId: true },
      });
      await this.updateProductReviewAnalytics(deleted.productId);
      return { success: true, message: "Review deleted" };
    } catch {
      return { success: false, error: "Failed to delete review" };
    }
  }

  static async getProductReviewAnalytics(productId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<string, number>;
    verifiedReviewsPercentage: number;
  }> {
    try {
      const rows = await prisma.productReview.findMany({
        where: { productId, isPublished: true },
        select: { rating: true, isVerified: true },
      });
      const total = rows.length;
      const avg = total
        ? (rows as Array<Pick<ProductReview, "rating" | "isVerified">>).reduce(
            (s, r) => s + r.rating,
            0
          ) / total
        : 0;
      const dist: Record<string, number> = {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
      };
      (rows as Array<Pick<ProductReview, "rating" | "isVerified">>).forEach(
        (r) => {
          const key = String(r.rating) as keyof typeof dist;
          dist[key] = (dist[key] || 0) + 1;
        }
      );
      const verifiedCount = (
        rows as Array<Pick<ProductReview, "rating" | "isVerified">>
      ).filter((r) => r.isVerified).length;
      return {
        averageRating: Math.round(avg * 10) / 10,
        totalReviews: total,
        ratingDistribution: dist,
        verifiedReviewsPercentage: total
          ? Math.round((verifiedCount / total) * 1000) / 10
          : 0,
      };
    } catch {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {},
        verifiedReviewsPercentage: 0,
      };
    }
  }

  private static async updateProductReviewAnalytics(productId: string) {
    const analytics = await this.getProductReviewAnalytics(productId);
    await prisma.reviewAnalytics.upsert({
      where: { productId },
      update: {
        totalReviews: analytics.totalReviews,
        averageRating: analytics.averageRating,
        ratingCounts: JSON.stringify(analytics.ratingDistribution),
        lastReviewAt: new Date(),
      },
      create: {
        productId,
        totalReviews: analytics.totalReviews,
        averageRating: analytics.averageRating,
        ratingCounts: JSON.stringify(analytics.ratingDistribution),
        helpfulVotes: 0,
        lastReviewAt: new Date(),
      },
    });
  }
}
