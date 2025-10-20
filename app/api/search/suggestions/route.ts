import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { CacheService } from "@/lib/server/cacheService";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);
    const categoryId = searchParams.get("category") || undefined;
    const brandId = searchParams.get("brand") || undefined;

    const session = await getServerSession(authOptionsEnhanced);
    const userId = session?.user?.id;

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          suggestions: [],
          trending: await CacheService.getCachedTrendingSearches(limit),
          categories: await CacheService.getCachedCategories(),
          brands: await CacheService.getCachedBrands(),
        },
      });
    }

    // Search products with caching
    const products = await CacheService.searchProducts(
      query,
      categoryId,
      brandId,
      limit
    );

    // Track search for analytics
    if (userId) {
      await CacheService.trackSearch(query, userId, products.length);
    }

    // Format suggestions
    const suggestions = products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.priceCents,
      image: product.images[0]?.url || "/placeholder.svg",
      brand: product.brand?.name || "",
      category: product.category?.name || "",
    }));

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        trending: await CacheService.getCachedTrendingSearches(5),
        totalResults: products.length,
      },
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Search suggestions API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get search suggestions",
      },
      { status: 500 }
    );
  }
}
