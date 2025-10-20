import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { CMSService } from "@/lib/server/cmsService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logoSettings = await CMSService.getLogoSettings();

    return NextResponse.json({
      success: true,
      logoSettings,
    });
  } catch (error) {
    logger.error("Failed to get public logo settings:", error);

    // Return default settings on error
    return NextResponse.json({
      success: true,
      logoSettings: {
        logoText: "NVRSTL",
        logoImageUrl: undefined,
        logoType: "text",
        logoTextPrefix: "DY",
        logoTextSuffix: "OFFICIALETTE",
        logoAccentColor: "#DC2626",
      },
    });
  }
}
