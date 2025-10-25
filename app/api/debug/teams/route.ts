import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    console.log("🔍 Debug: Testing teams API...");

    // Get all teams
    const teams = await prisma.shopTeam.findMany({
      include: {
        subcategory: {
          include: {
            category: true,
          },
        },
      },
      orderBy: [
        { subcategory: { category: { name: "asc" } } },
        { subcategory: { name: "asc" } },
        { name: "asc" },
      ],
    });

    // Get products without teams
    const unlinkedProducts = await prisma.product.findMany({
      where: {
        teamId: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        brand: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    console.log(
      `✅ Found ${teams.length} teams and ${unlinkedProducts.length} unlinked products`
    );

    return NextResponse.json({
      success: true,
      teams,
      unlinkedProducts,
      message: "Teams API is working",
    });
  } catch (error: any) {
    console.error("❌ Debug: Teams API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Teams API failed",
      },
      { status: 500 }
    );
  }
}
