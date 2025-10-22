import { NextRequest, NextResponse } from "next/server";
import { CMSService } from "@/lib/server/cmsService";
import { ensureAdmin } from "@/lib/server/auth";
import { logger } from "@/lib/server/logger";

// Get all category sections
export const GET = async function GET() {
  try {
    const sections = await CMSService.getCategorySections();
    return NextResponse.json({ sections });
  } catch (error) {
    logger.error("Error fetching category sections:", error);
    return NextResponse.json(
      { error: "Failed to fetch category sections" },
      { status: 500 }
    );
  }
};

// Create a new category section
export const POST = async function POST(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, slug, description, displayOrder } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Title and slug are required" },
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

    const section = await CMSService.createCategorySection({
      title,
      slug,
      description,
      displayOrder,
    });

    return NextResponse.json({ section });
  } catch (error) {
    logger.error("Error creating category section:", error);
    return NextResponse.json(
      { error: "Failed to create category section" },
      { status: 500 }
    );
  }
};
