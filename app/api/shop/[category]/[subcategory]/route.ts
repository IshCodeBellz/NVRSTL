import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; subcategory: string } }
) {
  try {
    const categorySlug = params.category;
    const subcategorySlug = params.subcategory;

    // Find the category and subcategory in the database
    const category = await prisma.shopCategory.findUnique({
      where: { slug: categorySlug },
      include: {
        subcategories: {
          where: { slug: subcategorySlug },
          include: {
            teams: {
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
    });

    if (!category || !category.subcategories.length) {
      return NextResponse.json(
        { error: "Category or subcategory not found" },
        { status: 404 }
      );
    }

    const subcategory = category.subcategories[0];

    // Transform teams data
    const teams = subcategory.teams.map((team) => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
      logoUrl: team.logoUrl,
      productCount: 0, // TODO: Calculate actual product count
    }));

    const categoryData = {
      id: subcategory.id,
      name: subcategory.name,
      description: subcategory.description,
      image: subcategory.imageUrl,
      products: [], // TODO: Get actual products
      teams: teams,
    };

    return NextResponse.json({
      category: categoryData,
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Failed to fetch shop category:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop category" },
      { status: 500 }
    );
  }
}
