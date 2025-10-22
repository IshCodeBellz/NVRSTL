import {
  ProductCache,
  SearchCache,
  SessionCache,
} from "@/lib/server/performance/RedisService";
import { perfMonitor } from "@/lib/server/monitoring/performance";
import { prisma } from "@/lib/server/prisma";
import type {
  Product,
  ProductVariant,
  ProductImage,
  SizeVariant,
  Brand,
  Category,
  Prisma,
} from "@prisma/client";

/**
 * High-level caching utilities for common application patterns
 */

export class CacheManager {
  private static productCache = new ProductCache();
  private static searchCache = new SearchCache();
  private static sessionCache = new SessionCache();

  // Product caching utilities
  static async getCachedProduct(productId: string) {
    return perfMonitor.timeFunction(
      "cache_get_product",
      async () => {
        let product = await this.productCache.getProduct(productId);

        if (!product) {
          // Cache miss - fetch from database
          product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
              images: true,
              variants: true,
              sizeVariants: true,
              brand: true,
              category: true,
            },
          });

          if (product) {
            await this.productCache.setProduct(productId, product);
          }
        }

        return product;
      },
      { product_id: productId }
    );
  }

  static async getCachedProductsByCategory(
    categoryId: string,
    filters?: {
      isActive?: boolean;
      isFeatured?: boolean;
      limit?: number;
      offset?: number;
    }
  ) {
    return perfMonitor.timeFunction(
      "cache_get_products_by_category",
      async () => {
        const cacheKey = `${categoryId}:${JSON.stringify(filters || {})}`;
        let products = await this.productCache.getProductsByCategory(cacheKey);

        if (!products) {
          // Cache miss - fetch from database
          const where: Record<string, unknown> = { categoryId };

          if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive;
          }

          if (filters?.isFeatured !== undefined) {
            where.isFeatured = filters.isFeatured;
          }

          products = await prisma.product.findMany({
            where,
            include: {
              images: {
                where: { position: 0 }, // Only get first image for listings
                take: 1,
              },
              brand: {
                select: { name: true },
              },
              variants: true,
              sizeVariants: true,
            },
            orderBy: { createdAt: "desc" },
            take: filters?.limit || 50,
            skip: filters?.offset || 0,
          });

          if (products) {
            await this.productCache.setProductsByCategory(cacheKey, products);
          }
        }

        return products;
      },
      {
        category_id: categoryId,
        filters: JSON.stringify(filters || {}),
      }
    );
  }

  // Search caching utilities
  static async getCachedSearchResults(
    query: string,
    filters?: {
      categoryId?: string;
      brandId?: string;
      minPrice?: number;
      maxPrice?: number;
      gender?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    return perfMonitor.timeFunction(
      "cache_get_search_results",
      async () => {
        let results = await this.searchCache.getSearchResults(query, filters);

        if (!results) {
          // Cache miss - perform search
          const where: Prisma.ProductWhereInput = {
            isActive: true,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { tags: { contains: query, mode: "insensitive" } },
            ],
          };

          if (filters?.categoryId) {
            where.categoryId = filters.categoryId;
          }

          if (filters?.brandId) {
            where.brandId = filters.brandId;
          }

          if (filters?.gender) {
            where.gender = filters.gender;
          }

          if (filters?.minPrice || filters?.maxPrice) {
            where.priceCents = {};
            if (filters.minPrice) where.priceCents.gte = filters.minPrice * 100;
            if (filters.maxPrice) where.priceCents.lte = filters.maxPrice * 100;
          }

          const products = await prisma.product.findMany({
            where,
            include: {
              images: {
                where: { position: 0 },
                take: 1,
              },
              brand: {
                select: { name: true },
              },
              variants: true,
            },
            orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
            take: filters?.limit || 20,
            skip: filters?.offset || 0,
          });

          results = {
            products,
            total: products.length,
            query,
            filters,
          };

          await this.searchCache.setSearchResults(query, results, filters);
        }

        return results;
      },
      {
        search_query: query,
        filters: JSON.stringify(filters || {}),
      }
    );
  }

  // Session caching utilities
  static async getCachedSession(sessionId: string) {
    return this.sessionCache.getSession(sessionId);
  }

  static async setCachedSession(
    sessionId: string,
    sessionData: Record<string, unknown>
  ) {
    return this.sessionCache.setSession(sessionId, sessionData);
  }

  // Cache invalidation utilities
  static async invalidateProduct(productId: string) {
    await this.productCache.invalidateProduct(productId);

    // Also invalidate related search and category caches
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });

    if (product?.categoryId) {
      await this.productCache.invalidateCategory(product.categoryId);
    }

    await this.searchCache.invalidateSearchResults();
  }

  static async invalidateCategory(categoryId: string) {
    await this.productCache.invalidateCategory(categoryId);
    await this.searchCache.invalidateSearchResults();
  }

  // Bulk operations with caching
  static async getCachedProductsById(productIds: string[]) {
    return perfMonitor.timeFunction(
      "cache_get_products_bulk",
      async () => {
        const cacheKeys = productIds.map((id) => `product:${id}`);
        const { RedisService } = await import(
          "@/lib/server/performance/RedisService"
        );
        const redis = RedisService.getInstance();

        const cachedProducts = await redis.mget(cacheKeys);
        const results: Array<
          | (Product & {
              variants?: ProductVariant[];
              images?: ProductImage[];
              brand?: Brand | null;
              category?: Category | null;
              sizeVariants?: SizeVariant[];
            })
          | null
        > = [];
        const missingIds: string[] = [];

        // Identify cache hits and misses
        cachedProducts.forEach((product, index) => {
          if (product !== null) {
            results[index] = product as any;
          } else {
            missingIds.push(productIds[index]);
            results[index] = null;
          }
        });

        // Fetch missing products from database
        if (missingIds.length > 0) {
          const missingProducts = await prisma.product.findMany({
            where: { id: { in: missingIds } },
            include: {
              images: true,
              variants: true,
              sizeVariants: true,
              brand: true,
              category: true,
            },
          });

          // Cache the fetched products and update results
          const cacheData: Record<string, any> = {};

          missingProducts.forEach((product) => {
            const index = productIds.indexOf(product.id);
            if (index !== -1) {
              results[index] = product as any;
              cacheData[`product:${product.id}`] = product;
            }
          });

          if (Object.keys(cacheData).length > 0) {
            await redis.mset(cacheData, 3600); // 1 hour TTL
          }
        }

        return results.filter(Boolean); // Remove null entries
      },
      {
        product_count: productIds.length.toString(),
      }
    );
  }

  // Warm cache utilities
  static async warmProductCache(limit: number = 100) {
    console.log(`Warming product cache with ${limit} products...`);

    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        images: true,
        variants: true,
        sizeVariants: true,
        brand: true,
        category: true,
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    const cachePromises = products.map((product) =>
      this.productCache.setProduct(product.id, product)
    );

    await Promise.all(cachePromises);
    console.log(`✅ Warmed cache with ${products.length} products`);
  }

  static async warmCategoryCache() {
    console.log("Warming category cache...");

    const categories = await prisma.category.findMany({
      where: { isActive: true },
    });

    const cachePromises = categories.map(async (category) => {
      const products = await prisma.product.findMany({
        where: {
          categoryId: category.id,
          isActive: true,
        },
        include: {
          images: {
            where: { position: 0 },
            take: 1,
          },
          brand: {
            select: { name: true },
          },
        },
        take: 20, // Cache first 20 products per category
      });

      return this.productCache.setProductsByCategory(category.id, products);
    });

    await Promise.all(cachePromises);
    console.log(`✅ Warmed cache for ${categories.length} categories`);
  }

  // Cache statistics
  static async getCacheStatistics() {
    const { RedisService } = await import(
      "@/lib/server/performance/RedisService"
    );
    const redis = RedisService.getInstance();

    return {
      isHealthy: redis.isHealthy(),
      stats: await redis.getStats(),
    };
  }
}

// Utility decorators for automatic caching
export function withCache(ttl: number = 3600) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheKey = `method:${
        target.constructor.name
      }:${propertyKey}:${JSON.stringify(args)}`;
      const { RedisService } = await import(
        "@/lib/server/performance/RedisService"
      );
      const redis = RedisService.getInstance();

      return redis.getOrSet(
        cacheKey,
        () => originalMethod.apply(this, args),
        ttl
      );
    };

    return descriptor;
  };
}

// Export for easy use
export default CacheManager;
