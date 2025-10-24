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

    // Find the team in the database
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
      products: [], // TODO: Get actual products for this team
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
