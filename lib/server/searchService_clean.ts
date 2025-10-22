import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export interface SearchResult {
  products: unknown[];
  totalCount: number;
  facets: {
    brands: Array<{ name: string; count: number }>;
    categories: Array<{ name: string; count: number }>;
    priceRanges: Array<{ min: number; max: number; count: number }>;
    colors: Array<{ name: string; count: number }>;
    sizes: Array<{ name: string; count: number }>;
    ratings: Array<{ rating: number; count: number }>;
  };
  suggestions: string[];
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchOptions {
  query?: string;
  category?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  color?: string;
  size?: string;
  rating?: number;
  sortBy?: "relevance" | "price_asc" | "price_desc" | "rating" | "newest";
  page?: number;
  limit?: number;
}

export class SearchService {
  // Main search function
  static async searchProducts(options: SearchOptions): Promise<SearchResult> {
    try {
      const {
        query = "",
        category,
        brand,
        priceMin,
        priceMax,
        color,
        size,
        rating,
        sortBy = "relevance",
        page = 1,
        limit = 20,
      } = options;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.ProductWhereInput = {
        isActive: true,
      };

      if (query) {
        where.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { brand: { name: { contains: query, mode: "insensitive" } } },
        ];
      }

      if (category) where.categoryId = category;
      if (brand) where.brandId = brand;
      if (priceMin !== undefined || priceMax !== undefined) {
        where.priceCents = {};
        if (priceMin !== undefined) where.priceCents.gte = priceMin * 100;
        if (priceMax !== undefined) where.priceCents.lte = priceMax * 100;
      }
      if (rating) {
        where.productAnalytics = { averageRating: { gte: rating } };
      }

      // Build order clause
      let orderBy: Prisma.ProductOrderByWithRelationInput = {
        createdAt: "desc",
      };
      switch (sortBy) {
        case "price_asc":
          orderBy = { priceCents: "asc" };
          break;
        case "price_desc":
          orderBy = { priceCents: "desc" };
          break;
        case "rating":
          orderBy = { productAnalytics: { averageRating: "desc" } };
          break;
        case "newest":
          orderBy = { createdAt: "desc" };
          break;
        case "relevance":
        default:
          // For relevance, we could implement more sophisticated scoring
          orderBy = { createdAt: "desc" };
          break;
      }

      // Execute search
      // Apply variant-based filters at the product level when provided
      // Variant filters at product level
      const colorFilter: Prisma.ProductVariantWhereInput | undefined = color
        ? {
            AND: [
              { type: { equals: "color" } },
              {
                OR: [
                  { value: { equals: color } },
                  { hexColor: { equals: color } },
                ],
              },
            ],
          }
        : undefined;

      const sizeFilter: Prisma.ProductVariantWhereInput | undefined = size
        ? { AND: [{ type: { equals: "size" } }, { value: { equals: size } }] }
        : undefined;

      if (colorFilter && sizeFilter) {
        where.AND = [
          { variants: { some: colorFilter } },
          { variants: { some: sizeFilter } },
        ];
      } else if (colorFilter) {
        where.variants = { some: colorFilter };
      } else if (sizeFilter) {
        where.variants = { some: sizeFilter };
      }

      const [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            brand: true,
            category: true,
            variants: {
              where: {
                // Filter included variants to those relevant to requested filters
                AND: [
                  color
                    ? {
                        OR: [
                          { AND: [{ type: "color" }, { value: color }] },
                          { AND: [{ type: "color" }, { hexColor: color }] },
                        ],
                      }
                    : {},
                  size ? { AND: [{ type: "size" }, { value: size }] } : {},
                ],
              },
            },
          },
        }),
        prisma.product.count({ where }),
      ]);

      // Get facets
      const facets = await this.getFacets();

      // Get suggestions
      const suggestions = await this.getSuggestions(query);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        products,
        totalCount,
        facets,
        suggestions,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.error("Error searching products:", error);
      return {
        products: [],
        totalCount: 0,
        facets: {
          brands: [],
          categories: [],
          priceRanges: [],
          colors: [],
          sizes: [],
          ratings: [],
        },
        suggestions: [],
        page: 1,
        limit: 20,
        totalPages: 0,
      };
    }
  }

  // Public wrappers used by demo route
  static async getSearchSuggestions(
    query: string,
    limit = 5
  ): Promise<string[]> {
    return this.getSuggestions(query).then((s) => s.slice(0, limit));
  }

  static async getTrendingSearches(limit = 5): Promise<string[]> {
    // Simple mocked trending list
    const trending = [
      "jeans",
      "sneakers",
      "hoodie",
      "summer dress",
      "ankle boots",
    ];
    return trending.slice(0, limit);
  }

  // Get search facets
  private static async getFacets(): Promise<SearchResult["facets"]> {
    try {
      // In a full implementation, we'd group products to compute facets. Placeholder returns below.

      return {
        brands: [], // Would need to fetch brand names
        categories: [], // Would need to fetch category names
        priceRanges: [
          { min: 0, max: 50, count: 0 },
          { min: 50, max: 100, count: 0 },
          { min: 100, max: 200, count: 0 },
          { min: 200, max: 500, count: 0 },
        ],
        colors: [],
        sizes: [],
        ratings: [
          { rating: 5, count: 0 },
          { rating: 4, count: 0 },
          { rating: 3, count: 0 },
          { rating: 2, count: 0 },
          { rating: 1, count: 0 },
        ],
      };
    } catch (error) {
      console.error("Error getting facets:", error);
      return {
        brands: [],
        categories: [],
        priceRanges: [],
        colors: [],
        sizes: [],
        ratings: [],
      };
    }
  }

  // Get search suggestions
  private static async getSuggestions(query: string): Promise<string[]> {
    try {
      if (!query || query.length < 2) return [];

      // Get popular search terms (this would be from a search analytics table)
      const suggestions = [
        "dress",
        "shoes",
        "handbag",
        "jewelry",
        "accessories",
      ].filter((suggestion) =>
        suggestion.toLowerCase().includes(query.toLowerCase())
      );

      return suggestions.slice(0, 5);
    } catch (error) {
      console.error("Error getting suggestions:", error);
      return [];
    }
  }

  // Track search analytics
  static async trackSearch(
    query: string,
    resultCount: number,
    userId?: string
  ): Promise<void> {
    try {
      // Log search for analytics
      console.log("Search tracked:", { query, resultCount, userId });

      // This would typically create a search analytics record
      // For now, just log the search
    } catch (error) {
      console.error("Error tracking search:", error);
    }
  }

  // Get search analytics
  static async getSearchAnalytics(): Promise<{
    totalSearches: number;
    avgResultsPerSearch: number;
    noResultsRate: number;
    clickThroughRate: number;
  }> {
    try {
      // Mock analytics data - would come from actual analytics tracking
      return {
        totalSearches: 1000,
        avgResultsPerSearch: 15.5,
        noResultsRate: 12.3,
        clickThroughRate: 45.2,
      };
    } catch (error) {
      console.error("Error getting search analytics:", error);
      return {
        totalSearches: 0,
        avgResultsPerSearch: 0,
        noResultsRate: 0,
        clickThroughRate: 0,
      };
    }
  }
}
