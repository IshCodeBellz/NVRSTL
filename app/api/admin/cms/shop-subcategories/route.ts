import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { ensureAdmin } from "@/lib/server/auth";

export async function GET() {
  try {
    const subcategories = await prisma.shopSubcategory.findMany({
      include: {
        category: true,
        teams: {
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
      orderBy: {
        displayOrder: "asc",
      },
    });

    return NextResponse.json({ subcategories });
  } catch (error) {
    console.error("Error fetching shop subcategories:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop subcategories" },
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
    const { categoryId, slug, name, description, imageUrl, displayOrder } =
      body;

    if (!categoryId || !slug || !name) {
      return NextResponse.json(
        { error: "Category ID, slug and name are required" },
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

    const subcategory = await prisma.shopSubcategory.create({
      data: {
        categoryId,
        slug,
        name,
        description,
        imageUrl,
        displayOrder: displayOrder || 0,
      },
    });

    return NextResponse.json({ subcategory });
  } catch (error) {
    console.error("Error creating shop subcategory:", error);
    return NextResponse.json(
      { error: "Failed to create shop subcategory" },
      { status: 500 }
    );
  }
}
