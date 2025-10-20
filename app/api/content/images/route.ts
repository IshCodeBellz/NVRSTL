import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { CMSService } from "@/lib/server/cmsService";

export const dynamic = "force-dynamic";

// Get homepage images for frontend
export async function GET() {
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
}
