import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { category: string } }
) {
  try {
    const { category } = params;

    // Get all brands that have active products in this category
    const brands = await prisma.brand.findMany({
      where: {
        products: {
          some: {
            category: { slug: category },
            isActive: true,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            products: {
              where: {
                category: { slug: category },
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const brandsWithCount = brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      productCount: brand._count.products,
    }));

    return NextResponse.json(brandsWithCount);
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Error fetching category brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands for category" },
      { status: 500 }
    );
  }
}
