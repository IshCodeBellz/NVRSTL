import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const category = searchParams.get("category") || undefined;
    const brand = searchParams.get("brand") || undefined;
    const size = searchParams.get("size") || undefined;
    const gender = searchParams.get("gender") || undefined;
    const min = parseFloat(searchParams.get("min") || "0");
    const max = parseFloat(searchParams.get("max") || "1000000");
    const sort = (searchParams.get("sort") || "newest").toLowerCase();
    const page = Math.max(
      parseInt(searchParams.get("page") || "1", 10) || 1,
      1
    );
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "30", 10) || 30,
      60
    );
    const includeFacets = searchParams.get("facets") === "1";
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      deletedAt: null,
      priceCents: { gte: Math.round(min * 100), lte: Math.round(max * 100) },
    };

    if (category) where.category = { slug: category };
    if (brand) where.brandId = brand;
    if (size) where.sizes = { some: { label: size } };
    if (gender) where.gender = { in: [gender, "unisex"] };

    // Add search query
    if (q) {
      const searchTerms = q.toLowerCase().split(/\s+/).filter(Boolean);

      // Add synonyms for better search results
      const synonyms: Record<string, string[]> = {
        jersey: ["shirt", "kit", "uniform", "top"],
        shirt: ["jersey", "kit", "uniform", "top"],
        sneakers: ["shoes", "trainers", "kicks"],
        shoes: ["sneakers", "trainers", "kicks"],
        pants: ["trousers", "jeans"],
        jeans: ["pants", "trousers"],
        dress: ["gown", "frock"],
        jacket: ["coat", "blazer"],
        hat: ["cap", "beanie"],
        bag: ["purse", "handbag", "tote"],
      };

      // Expand search terms with synonyms
      const expandedTerms = new Set<string>();
      searchTerms.forEach((term) => {
        expandedTerms.add(term);
        if (synonyms[term]) {
          synonyms[term].forEach((synonym) => expandedTerms.add(synonym));
        }
        // Also add reverse synonyms
        Object.entries(synonyms).forEach(([key, values]) => {
          if (values.includes(term)) {
            expandedTerms.add(key);
          }
        });
      });

      where.OR = Array.from(expandedTerms).flatMap((term) => [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { brand: { name: { contains: term, mode: "insensitive" } } },
        { category: { name: { contains: term, mode: "insensitive" } } },
        { sku: { contains: term, mode: "insensitive" } },
      ]);
    }

    // Build order by
    let orderBy: Record<string, "asc" | "desc"> | undefined = undefined;
    switch (sort) {
      case "price_asc":
        orderBy = { priceCents: "asc" };
        break;
      case "price_desc":
        orderBy = { priceCents: "desc" };
        break;
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "trending":
        orderBy = { createdAt: "desc" }; // Simplified for now
        break;
      case "relevance":
        orderBy = { createdAt: "desc" }; // Simplified for now
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    // Get total count
    const totalCount = await prisma.product.count({ where });

    // Get products
    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        brand: true,
        category: true,
      },
    });

    // Format response
    const items = products.map((product) => ({
      id: product.id,
      name: product.name,
      priceCents: product.priceCents,
      comparePriceCents: product.comparePriceCents,
      image: product.images[0]?.url || "/placeholder.svg",
      brandName: product.brand?.name,
      categoryName: product.category?.name,
      sku: product.sku,
      createdAt: product.createdAt,
    }));

    // Build facets if requested
    let facets = null;
    if (includeFacets) {
      const [categories, brands] = await Promise.all([
        prisma.category.findMany({
          select: { id: true, name: true, slug: true },
          orderBy: { name: "asc" },
        }),
        prisma.brand.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ]);

      facets = {
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        })),
        brands: brands.map((b) => ({ id: b.id, name: b.name })),
        priceRange: {
          min: 0,
          max: 1000000,
        },
      };
    }

    return NextResponse.json({
      items,
      total: items.length,
      totalCount,
      page,
      pageSize: limit,
      facets,
      query: q,
    });
  } catch (error) {
    logger.error("Search API error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        details: (error as Error).message,
        items: [],
        total: 0,
        totalCount: 0,
      },
      { status: 500 }
    );
  }
}
