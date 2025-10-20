import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";
import { SystemSettingsService } from "@/lib/server/systemSettingsService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Admin preview override via query param (?includeZeroBrands=true)
    const { searchParams } = new URL(req.url);
    const includeZeroBrandsParam = searchParams.get("includeZeroBrands");
    const includeZeroBrandsOverride =
      includeZeroBrandsParam === "1" || includeZeroBrandsParam === "true";

    // Feature flag from system settings determines default behavior
    const hideZeroBrands = await SystemSettingsService.getSettingValue<boolean>(
      "features.hide_zero_product_brands",
      false
    );

    // Get all brands
    const brands = await prisma.brand.findMany({
      select: {
        id: true,
        name: true,
        logoUrl: true,
        backgroundImage: true,
        description: true,
        isFeatured: true,
        displayOrder: true,
      },
      orderBy: [
        { isFeatured: "desc" },
        { displayOrder: "asc" },
        { name: "asc" },
      ],
    });

    // Compute active product counts per brand in one query
    const counts = await prisma.product.groupBy({
      by: ["brandId"],
      where: { isActive: true, deletedAt: null, brandId: { not: null } },
      _count: { _all: true },
    });
    const countMap = new Map<string, number>();
    for (const row of counts) {
      if (row.brandId) countMap.set(row.brandId, row._count._all);
    }

    // Transform the data to match our interface (do not filter out brands with 0 products)
    let transformedBrands = brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      logoUrl: brand.logoUrl || undefined,
      backgroundImage: brand.backgroundImage || undefined,
      description: brand.description || undefined,
      isFeatured: !!brand.isFeatured,
      displayOrder: brand.displayOrder || 0,
      productCount: countMap.get(brand.id) ?? 0,
    }));

    // Conditionally filter out brands with zero products based on feature flag
    if (hideZeroBrands && !includeZeroBrandsOverride) {
      transformedBrands = transformedBrands.filter((b) => b.productCount > 0);
    }

    return NextResponse.json({
      brands: transformedBrands,
      total: transformedBrands.length,
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Failed to fetch brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}
