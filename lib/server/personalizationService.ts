import { prisma } from "./prisma";

type Strategy = "collaborative" | "content" | "hybrid" | "trending";

export class PersonalizationService {
  // Admin page instance methods
  async getAlgorithmPerformance(): Promise<
    Array<{
      name: string;
      status: "active" | "paused";
      clickRate: number;
      conversionRate: number;
      coverage: number;
    }>
  > {
    // Mocked analytics; replace with real metrics later
    return [
      {
        name: "Collaborative Filtering",
        status: "active",
        clickRate: 12.4,
        conversionRate: 3.1,
        coverage: 86.0,
      },
      {
        name: "Content-Based",
        status: "active",
        clickRate: 9.7,
        conversionRate: 2.4,
        coverage: 73.5,
      },
      {
        name: "Hybrid",
        status: "active",
        clickRate: 14.2,
        conversionRate: 3.8,
        coverage: 91.3,
      },
    ];
  }

  async getUserSegments(): Promise<
    Array<{
      name: string;
      description: string;
      userCount: number;
      avgOrderValue: number;
      engagementScore: number;
    }>
  > {
    return [
      {
        name: "High-Value Shoppers",
        description: "Frequent buyers with high AOV",
        userCount: 1245,
        avgOrderValue: 186,
        engagementScore: 78,
      },
      {
        name: "Deal Seekers",
        description: "Responsive to promotions and sales",
        userCount: 2890,
        avgOrderValue: 74,
        engagementScore: 64,
      },
      {
        name: "New Users",
        description: "Recently joined, exploring catalog",
        userCount: 952,
        avgOrderValue: 59,
        engagementScore: 42,
      },
    ];
  }

  async getRecommendationStats(): Promise<{
    dailyRecommendations: number;
    clickThroughRate: number;
    revenueAttribution: number;
    userCoverage: number;
  }> {
    return {
      dailyRecommendations: 12840,
      clickThroughRate: 11.8,
      revenueAttribution: 24560,
      userCoverage: 88.4,
    };
  }

  // API/static methods
  static async getPersonalizedRecommendations(
    userId: string,
    options: {
      limit?: number;
      strategy?: Strategy;
      categoryId?: string;
      excludeProductIds?: string[];
    } = {}
  ): Promise<{
    strategy: Strategy;
    products: Array<{ id: string; name: string; priceCents: number }>;
    reasons: Array<{ type: string; confidence: number; description?: string }>;
  }> {
    const {
      limit = 12,
      strategy = "hybrid",
      categoryId,
      excludeProductIds,
    } = options;

    // Fetch a few active products as mock recommendations
    const products = await prisma.product
      .findMany({
        where: {
          isActive: true,
          ...(categoryId ? { categoryId } : {}),
          ...(excludeProductIds && excludeProductIds.length
            ? { id: { notIn: excludeProductIds } }
            : {}),
        },
        take: limit,
        select: { id: true, name: true, priceCents: true },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []);

    const reasons = [
      {
        type: "collaborative",
        confidence: 0.72,
        description: "Similar users liked these",
      },
      {
        type: "content",
        confidence: 0.63,
        description: "Matches your viewed categories",
      },
      { type: "trending", confidence: 0.51, description: "Currently popular" },
    ];

    return { strategy, products, reasons };
  }

  static async trackUserInteraction(
    userId: string,
    productId: string,
    interactionType:
      | "view"
      | "cart_add"
      | "wishlist_add"
      | "purchase"
      | "search"
  ): Promise<void> {
    // Placeholder: log; replace with persistence/analytics later
    console.log("trackUserInteraction", { userId, productId, interactionType });
  }

  static async getUserPreferences(userId: string): Promise<{
    categories: Array<{ id: string; name: string }>;
    brands: Array<{ id: string; name: string }>;
    priceRange: { min: number; max: number };
    sizes: Array<{ value: string }>;
  }> {
    // Mocked preferences; could be derived from orders/views later
    return {
      categories: [
        { id: "cat_1", name: "Tops" },
        { id: "cat_2", name: "Jeans" },
        { id: "cat_3", name: "Shoes" },
      ],
      brands: [
        { id: "brand_1", name: "Zara" },
        { id: "brand_2", name: "H&M" },
      ],
      priceRange: { min: 20, max: 120 },
      sizes: [{ value: "S" }, { value: "M" }, { value: "L" }],
    };
  }
}
