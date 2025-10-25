import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";

export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: { category: string; subcategory: string; team: string } }
) {
  try {
    const categorySlug = params.category;
    const subcategorySlug = params.subcategory;
    const teamSlug = params.team;

    // Find the team in the database with products
    const team = await prisma.shopTeam.findFirst({
      where: {
        slug: teamSlug,
        subcategory: {
          slug: subcategorySlug,
          category: {
            slug: categorySlug,
          },
        },
      },
      include: {
        subcategory: {
          include: {
            category: true,
          },
        },
        products: {
          where: {
            isActive: true,
          },
          include: {
            images: {
              orderBy: { position: "asc" },
            },
            brand: true,
            sizeVariants: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const teamData = {
      id: team.id,
      name: team.name,
      description: team.description,
      logoUrl: team.logoUrl,
      products: team.products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
        image: product.images[0]?.url || "/placeholder.svg",
        images: product.images.map((img) => img.url),
        brand: product.brand?.name,
        sizes: product.sizeVariants.map((size) => size.label),
        isJersey: product.isJersey,
        jerseyConfig: product.jerseyConfig,
      })),
    };

    return NextResponse.json({
      team: teamData,
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Failed to fetch team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}
