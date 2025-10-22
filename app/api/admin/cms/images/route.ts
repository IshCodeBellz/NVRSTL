import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { ensureAdmin } from "@/lib/server/auth";
import { withRequest } from "@/lib/server/logger";
import { CMSService } from "@/lib/server/cmsService";

export const dynamic = "force-dynamic";

// Get current homepage images
export const GET = withRequest(async function GET() {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const images = await CMSService.getHomePageImages();
    return NextResponse.json({ images });
  } catch (error) {
    logger.error("Error fetching homepage images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
});

// Update homepage images
export const POST = withRequest(async function POST(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      heroImageLeft,
      heroImageRight,
      heroLayout,
      categoryImages,
      categoryLabels,
      categorySlugs,
      leagueTitle,
    } = body;

    // Validate image URLs
    const validateImageUrl = (url: string) => {
      if (!url || url.trim() === "") return false;
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    if (heroImageLeft && !validateImageUrl(heroImageLeft)) {
      return NextResponse.json(
        { error: "Invalid hero image left URL" },
        { status: 400 }
      );
    }

    if (heroImageRight && !validateImageUrl(heroImageRight)) {
      return NextResponse.json(
        { error: "Invalid hero image right URL" },
        { status: 400 }
      );
    }

    if (heroLayout && !["two-image", "single-image"].includes(heroLayout)) {
      return NextResponse.json(
        { error: "Invalid hero layout. Must be 'two-image' or 'single-image'" },
        { status: 400 }
      );
    }

    if (categoryImages) {
      for (const [category, url] of Object.entries(categoryImages)) {
        if (url && typeof url === "string" && !validateImageUrl(url)) {
          return NextResponse.json(
            { error: `Invalid image URL for category: ${category}` },
            { status: 400 }
          );
        }
      }
    }

    await CMSService.updateHomePageImages({
      heroImageLeft,
      heroImageRight,
      heroLayout,
      categoryImages,
      categoryLabels,
      categorySlugs,
      leagueTitle,
    });

    const updatedImages = await CMSService.getHomePageImages();
    return NextResponse.json({ images: updatedImages });
  } catch (error) {
    logger.error("Error updating homepage images:", error);
    return NextResponse.json(
      { error: "Failed to update images" },
      { status: 500 }
    );
  }
});
