import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { ensureAdmin } from "@/lib/server/auth";
import { logger } from "@/lib/server/logger";

export async function GET() {
  try {
    const categories = await prisma.shopCategory.findMany({
      include: {
        subcategories: {
          include: {
            teams: true,
          },
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
      orderBy: {
        displayOrder: "asc",
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    logger.error("Error fetching shop categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { slug, name, description, imageUrl, displayOrder } = body;

    if (!slug || !name) {
      return NextResponse.json(
        { error: "Slug and name are required" },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-_]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        {
          error:
            "Slug must contain only lowercase letters, numbers, hyphens, and underscores",
        },
        { status: 400 }
      );
    }

    // Validate image URL if provided
    if (imageUrl && imageUrl.trim() !== "") {
      try {
        new URL(imageUrl);
      } catch {
        return NextResponse.json(
          { error: "Invalid image URL format" },
          { status: 400 }
        );
      }
    }

    const category = await prisma.shopCategory.create({
      data: {
        slug,
        name,
        description,
        imageUrl,
        displayOrder: displayOrder || 0,
      },
    });

    return NextResponse.json({ category });
  } catch (error) {
    logger.error("Error creating shop category:", error);
    return NextResponse.json(
      { error: "Failed to create shop category" },
      { status: 500 }
    );
  }
}
