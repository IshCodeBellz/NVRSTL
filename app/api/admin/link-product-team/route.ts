import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { ensureAdmin } from "@/lib/server/auth";

export async function POST(request: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { productId, teamId } = body;

    if (!productId || !teamId) {
      return NextResponse.json(
        { error: "Product ID and Team ID are required" },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Verify team exists
    const team = await prisma.shopTeam.findUnique({
      where: { id: teamId },
      select: { id: true, name: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Update product with team
    await prisma.product.update({
      where: { id: productId },
      data: { teamId },
    });

    return NextResponse.json({
      success: true,
      message: `Product "${product.name}" linked to team "${team.name}"`,
    });
  } catch (error) {
    console.error("Error linking product to team:", error);
    return NextResponse.json(
      { error: "Failed to link product to team" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all teams
    const teams = await prisma.shopTeam.findMany({
      include: {
        subcategory: {
          include: {
            category: true,
          },
        },
        products: {
          select: {
            id: true,
            name: true,
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

    return NextResponse.json({
      teams,
      unlinkedProducts,
    });
  } catch (error) {
    console.error("Error fetching teams and products:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
