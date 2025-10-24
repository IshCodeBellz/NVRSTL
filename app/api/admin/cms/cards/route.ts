import { NextRequest, NextResponse } from "next/server";
import { CMSService } from "@/lib/server/cmsService";
import { ensureAdmin } from "@/lib/server/auth";
import { logger } from "@/lib/server/logger";

// Create a new category card
export const POST = async function POST(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sectionId, title, slug, imageUrl, description, displayOrder } =
      body;

    if (!sectionId || !title || !slug) {
      return NextResponse.json(
        { error: "Section ID, title, and slug are required" },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-_\/]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        {
          error:
            "Slug must contain only lowercase letters, numbers, hyphens, underscores, and forward slashes",
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

    const card = await CMSService.createCategoryCard({
      sectionId,
      title,
      slug,
      imageUrl,
      description,
      displayOrder,
    });

    return NextResponse.json({ card });
  } catch (error) {
    logger.error("Error creating category card:", error);
    return NextResponse.json(
      { error: "Failed to create category card" },
      { status: 500 }
    );
  }
};
