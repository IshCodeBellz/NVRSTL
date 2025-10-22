import { NextRequest, NextResponse } from "next/server";
import { CMSService } from "@/lib/server/cmsService";
import { ensureAdmin } from "@/lib/server/auth";
import { logger } from "@/lib/server/logger";

// Update a category card
export const PUT = async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, slug, imageUrl, description, displayOrder, isActive } = body;

    // Validate slug format if provided
    if (slug) {
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

    const card = await CMSService.updateCategoryCard(params.id, {
      title,
      slug,
      imageUrl,
      description,
      displayOrder,
      isActive,
    });

    return NextResponse.json({ card });
  } catch (error) {
    logger.error("Error updating category card:", error);
    return NextResponse.json(
      { error: "Failed to update category card" },
      { status: 500 }
    );
  }
};

// Delete a category card
export const DELETE = async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await CMSService.deleteCategoryCard(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting category card:", error);
    return NextResponse.json(
      { error: "Failed to delete category card" },
      { status: 500 }
    );
  }
};
