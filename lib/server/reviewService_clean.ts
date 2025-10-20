import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export interface CreateReviewData {
  productId: string;
  userId: string;
  rating: number;
  title: string;
  content: string;
  verified?: boolean;
}

export interface ReviewAnalytics {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<string, number>;
  verifiedReviewsPercentage: number;
}

export class ReviewService {
  // Create a new review
  static async createReview(
    data: CreateReviewData
  ): Promise<{ success: boolean; error?: string; reviewId?: string }> {
    try {
      // Validation
      if (!data.productId || !data.userId || !data.content) {
        return { success: false, error: "Missing required fields" };
      }

      if (data.rating < 1 || data.rating > 5) {
        return { success: false, error: "Rating must be between 1 and 5" };
      }

      // Check for duplicate review
      const existingReview = await prisma.productReview.findFirst({
        where: {
          productId: data.productId,
          userId: data.userId,
        },
      });

      if (existingReview) {
        return {
          success: false,
          error: "You have already reviewed this product",
        };
      }

      // Create review
      const review = await prisma.productReview.create({
        data: {
          productId: data.productId,
          userId: data.userId,
          authorName: "Anonymous",
          rating: data.rating,
          title: data.title,
          content: data.content,
          isVerified: data.verified || false,
        },
      });

      // Update product analytics
      await this.updateProductReviewAnalytics(data.productId);

      return { success: true, reviewId: review.id };
    } catch (error) {
      console.error("Error creating review:", error);
      return { success: false, error: "Failed to create review" };
    }
  }

  // Get reviews for a product
  static async getProductReviews(
    productId: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: "rating" | "date" | "helpful";
      filterBy?: { rating?: number; verified?: boolean };
    } = {}
  ): Promise<{
    reviews: Array<{
      id: string;
      userId: string | null;
      rating: number;
      title: string | null;
      content: string;
      isVerified: boolean;
      createdAt: Date;
    }>;
    totalCount: number;
    analytics: ReviewAnalytics;
  }> {
    try {
      const { page = 1, limit = 10, sortBy = "date", filterBy = {} } = options;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.ProductReviewWhereInput = { productId };
      if (filterBy.rating) where.rating = filterBy.rating;
      if (filterBy.verified !== undefined) where.isVerified = filterBy.verified;

      // Build order clause
      let orderBy: Prisma.ProductReviewOrderByWithRelationInput = {
        createdAt: "desc",
      };
      if (sortBy === "rating") orderBy = { rating: "desc" };

      // Get reviews
      const [reviews, totalCount] = await Promise.all([
        prisma.productReview.findMany({
          where,
          orderBy,
          skip,
          take: limit,
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

      // Get analytics
      const analytics = await this.getProductReviewAnalytics(productId);

      return { reviews, totalCount, analytics };
    } catch (error) {
      console.error("Error getting product reviews:", error);
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

  // Get review analytics for a product
  static async getProductReviewAnalytics(
    productId: string
  ): Promise<ReviewAnalytics> {
    try {
      const reviews = await prisma.productReview.findMany({
        where: { productId },
        select: {
          rating: true,
          isVerified: true,
        },
      });

      const totalReviews = reviews.length;
      const averageRating =
        totalReviews > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) /
            totalReviews
          : 0;

      const ratingDistribution: Record<string, number> = {};
      for (let i = 1; i <= 5; i++) {
        ratingDistribution[i.toString()] = reviews.filter(
          (r) => r.rating === i
        ).length;
      }

      const verifiedCount = reviews.filter((r) => r.isVerified).length;
      const verifiedReviewsPercentage =
        totalReviews > 0 ? (verifiedCount / totalReviews) * 100 : 0;

      return {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        ratingDistribution,
        verifiedReviewsPercentage:
          Math.round(verifiedReviewsPercentage * 10) / 10,
      };
    } catch (error) {
      console.error("Error getting review analytics:", error);
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {},
        verifiedReviewsPercentage: 0,
      };
    }
  }

  // Update product review analytics
  private static async updateProductReviewAnalytics(
    productId: string
  ): Promise<void> {
    try {
      const analytics = await this.getProductReviewAnalytics(productId);

      // Update product analytics snapshot
      await prisma.productAnalytics.upsert({
        where: { productId },
        update: {
          averageRating: analytics.averageRating,
          reviewCount: analytics.totalReviews,
        },
        create: {
          productId,
          averageRating: analytics.averageRating,
          reviewCount: analytics.totalReviews,
        },
      });
    } catch (error) {
      console.error("Error updating product review analytics:", error);
    }
  }
}
