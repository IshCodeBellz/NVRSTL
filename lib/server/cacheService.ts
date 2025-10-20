import { prisma } from "./prisma";
import { cache } from "react";

/**
 * Cache Service for optimizing database queries and improving performance
 */
export class CacheService {
  /**
   * Cache duration in seconds
   */
  private static readonly CACHE_DURATION = {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
  };

  /**
   * Get cached product data
   */
  static getCachedProduct = cache(async (productId: string) => {
    return await prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { position: "asc" } },
        variants: true,
        reviews: {
          where: { isPublished: true },
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        category: true,
        brand: true,
      },
    });
  });

  /**
   * Get cached products by category
   */
  static getCachedProductsByCategory = cache(
    async (categoryId: string, limit: number = 20) => {
      return await prisma.product.findMany({
        where: {
          categoryId,
          isActive: true,
          deletedAt: null,
        },
        include: {
          images: { take: 1, orderBy: { position: "asc" } },
          brand: true,
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      });
    }
  );

  /**
   * Get cached featured products
   */
  static getCachedFeaturedProducts = cache(async (limit: number = 10) => {
    return await prisma.product.findMany({
      where: {
        isFeatured: true,
        isActive: true,
        deletedAt: null,
      },
      include: {
        images: { take: 1, orderBy: { position: "asc" } },
        brand: true,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  });

  /**
   * Get cached categories with product counts
   */
  static getCachedCategories = cache(async () => {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return categories.map((category) => ({
      ...category,
      productCount: category._count.products,
    }));
  });

  /**
   * Get cached brands with product counts
   */
  static getCachedBrands = cache(async () => {
    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return brands.map((brand) => ({
      ...brand,
      productCount: brand._count.products,
    }));
  });

  /**
   * Search products with caching
   */
  static searchProducts = cache(
    async (
      query: string,
      categoryId?: string,
      brandId?: string,
      limit: number = 20
    ) => {
      const whereClause: Record<string, unknown> = {
        isActive: true,
        deletedAt: null,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { tags: { contains: query, mode: "insensitive" } },
        ],
      };

      if (categoryId) {
        whereClause.categoryId = categoryId;
      }

      if (brandId) {
        whereClause.brandId = brandId;
      }

      return await prisma.product.findMany({
        where: whereClause,
        include: {
          images: { take: 1, orderBy: { position: "asc" } },
          brand: true,
          category: true,
        },
        take: limit,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      });
    }
  );

  /**
   * Get trending searches with simple query tracking
   */
  static getCachedTrendingSearches = cache(async (limit: number = 10) => {
    try {
      // For now, return some mock trending searches
      // This can be enhanced when proper search analytics are implemented
      return [
        { query: "shirts", count: 150 },
        { query: "jeans", count: 120 },
        { query: "sneakers", count: 98 },
        { query: "dresses", count: 85 },
        { query: "jackets", count: 72 },
        { query: "tops", count: 65 },
        { query: "bags", count: 55 },
        { query: "shoes", count: 48 },
      ].slice(0, limit);
    } catch (error) {
      console.error("Error:", error);
      console.error("Error fetching trending searches:", error);
      return [];
    }
  });

  /**
   * Track search (simplified version)
   */
  static async trackSearch(
    query: string,
    userId?: string,
    results: number = 0
  ) {
    try {
      // Track as user behavior
      if (userId) {
        await prisma.userBehavior.create({
          data: {
            userId,
            sessionId: `search_${Date.now()}`,
            eventType: "search",
            searchQuery: query.toLowerCase().trim(),
            metadata: JSON.stringify({ resultCount: results }),
          },
        });
      }
    } catch (error) {
      console.error("Error:", error);
      console.error("Error tracking search:", error);
    }
  }

  /**
   * Get user's recent activity with caching
   */
  static getCachedUserActivity = cache(
    async (userId: string, limit: number = 10) => {
      try {
        const behaviors = await prisma.userBehavior.findMany({
          where: { userId },
          include: {
            product: {
              include: {
                images: { take: 1, orderBy: { position: "asc" } },
                brand: true,
              },
            },
          },
          orderBy: { timestamp: "desc" },
          take: limit,
        });

        return behaviors;
      } catch (error) {
        console.error("Error:", error);
        console.error("Error fetching user activity:", error);
        return [];
      }
    }
  );

  /**
   * Get product recommendations based on user behavior
   */
  static getCachedRecommendations = cache(
    async (userId: string, limit: number = 10) => {
      try {
        // Get user's recent behavior
        const recentBehavior = await prisma.userBehavior.findMany({
          where: { userId },
          orderBy: { timestamp: "desc" },
          take: 20,
        });

        if (recentBehavior.length === 0) {
          // Return featured products if no behavior data
          return this.getCachedFeaturedProducts(limit);
        }

        // Get categories and brands from user behavior
        const productIds = recentBehavior
          .map((b) => b.productId)
          .filter((id): id is string => id !== null);

        const viewedProducts = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { categoryId: true, brandId: true },
        });

        const categoryIds = [
          ...new Set(
            viewedProducts
              .map((p) => p.categoryId)
              .filter((id): id is string => id !== null)
          ),
        ];
        const brandIds = [
          ...new Set(
            viewedProducts
              .map((p) => p.brandId)
              .filter((id): id is string => id !== null)
          ),
        ];

        // Get recommended products
        const recommendations = await prisma.product.findMany({
          where: {
            OR: [
              ...(categoryIds.length > 0
                ? [{ categoryId: { in: categoryIds } }]
                : []),
              ...(brandIds.length > 0 ? [{ brandId: { in: brandIds } }] : []),
            ],
            isActive: true,
            deletedAt: null,
            id: { notIn: productIds }, // Exclude already viewed products
          },
          include: {
            images: { take: 1, orderBy: { position: "asc" } },
            brand: true,
            category: true,
          },
          take: limit,
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        });

        return recommendations;
      } catch (error) {
        console.error("Error:", error);
        console.error("Error fetching recommendations:", error);
        return this.getCachedFeaturedProducts(limit);
      }
    }
  );

  /**
   * Get cached product analytics (using ProductMetrics)
   */
  static getCachedProductAnalytics = cache(async (productId: string) => {
    try {
      return await prisma.productMetrics.findUnique({
        where: { productId },
      });
    } catch (error) {
      console.error("Error:", error);
      console.error("Error fetching product analytics:", error);
      return null;
    }
  });

  /**
   * Track user behavior for analytics and recommendations
   */
  static async trackUserBehavior(
    userId: string | null,
    productId: string,
    eventType: "view" | "wishlist" | "cart" | "purchase",
    metadata?: Record<string, unknown>
  ) {
    try {
      await prisma.userBehavior.create({
        data: {
          userId,
          sessionId: `session_${Date.now()}`,
          eventType,
          productId,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      // Update product metrics
      const updateData: Record<string, { increment: number }> = {};
      switch (eventType) {
        case "view":
          updateData.views = { increment: 1 };
          updateData.detailViews = { increment: 1 };
          break;
        case "wishlist":
          updateData.wishlists = { increment: 1 };
          break;
        case "cart":
          updateData.addToCart = { increment: 1 };
          break;
        case "purchase":
          updateData.purchases = { increment: 1 };
          break;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.productMetrics.upsert({
          where: { productId },
          create: {
            productId,
            views: eventType === "view" ? 1 : 0,
            detailViews: eventType === "view" ? 1 : 0,
            wishlists: eventType === "wishlist" ? 1 : 0,
            addToCart: eventType === "cart" ? 1 : 0,
            purchases: eventType === "purchase" ? 1 : 0,
          },
          update: updateData,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      console.error("Error tracking user behavior:", error);
    }
  }

  /**
   * Manual cache invalidation (simplified)
   * Note: This is a placeholder for future cache management
   */
  static async invalidateCache(cacheKey: string) {
    console.log(`Cache invalidation requested for key: ${cacheKey}`);
    // Future implementation can include more sophisticated cache management
  }

  /**
   * Clean up resources (simplified)
   * Note: This is a placeholder for future cleanup tasks
   */
  static async cleanupExpiredCache() {
    console.log("Cache cleanup requested");
    // Future implementation can include cache cleanup logic
  }
}
