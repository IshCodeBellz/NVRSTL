import { NextRequest, NextResponse } from "next/server";
import { CMSService } from "@/lib/server/cmsService";
import { ensureAdmin } from "@/lib/server/auth";
import { logger } from "@/lib/server/logger";

// Get a specific category section
export const GET = async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const section = await CMSService.getCategorySection(params.id);
    if (!section) {
      return NextResponse.json(
        { error: "Category section not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ section });
  } catch (error) {
    logger.error("Error fetching category section:", error);
    return NextResponse.json(
      { error: "Failed to fetch category section" },
      { status: 500 }
    );
  }
};

// Update a category section
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
    const { title, slug, description, displayOrder, isActive } = body;

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

    const section = await CMSService.updateCategorySection(params.id, {
      title,
      slug,
      description,
      displayOrder,
      isActive,
    });

    return NextResponse.json({ section });
  } catch (error) {
    logger.error("Error updating category section:", error);
    return NextResponse.json(
      { error: "Failed to update category section" },
      { status: 500 }
    );
  }
};

// Delete a category section
export const DELETE = async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await CMSService.deleteCategorySection(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting category section:", error);
    return NextResponse.json(
      { error: "Failed to delete category section" },
      { status: 500 }
    );
  }
};
