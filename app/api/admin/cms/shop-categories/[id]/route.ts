import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { ensureAdmin } from "@/lib/server/auth";
import { logger } from "@/lib/server/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const category = await prisma.shopCategory.findUnique({
      where: { id: params.id },
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
    });

    if (!category) {
      return NextResponse.json(
        { error: "Shop category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    logger.error("Error fetching shop category:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop category" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { slug, name, description, imageUrl, displayOrder, isActive } = body;

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

    const category = await prisma.shopCategory.update({
      where: { id: params.id },
      data: {
        slug,
        name,
        description,
        imageUrl,
        displayOrder: displayOrder || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({ category });
  } catch (error) {
    logger.error("Error updating shop category:", error);
    return NextResponse.json(
      { error: "Failed to update shop category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.shopCategory.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting shop category:", error);
    return NextResponse.json(
      { error: "Failed to delete shop category" },
      { status: 500 }
    );
  }
}
