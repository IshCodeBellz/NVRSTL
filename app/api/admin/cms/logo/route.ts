import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { CMSService } from "@/lib/server/cmsService";
import { error as logError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { message: "Admin access required" },
        { status: 403 }
      );
    }

    const logoSettings = await CMSService.getLogoSettings();

    return NextResponse.json({
      success: true,
      logoSettings,
    });
  } catch (error) {
    logError("Failed to get logo settings", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { message: "Failed to retrieve logo settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { message: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate request body
    const {
      logoText,
      logoImageUrl,
      logoType,
      logoTextPrefix,
      logoTextSuffix,
      logoAccentColor,
    } = body;

    await CMSService.updateLogoSettings({
      logoText,
      logoImageUrl,
      logoType,
      logoTextPrefix,
      logoTextSuffix,
      logoAccentColor,
    });

    const updatedLogoSettings = await CMSService.getLogoSettings();

    return NextResponse.json({
      success: true,
      message: "Logo settings updated successfully",
      logoSettings: updatedLogoSettings,
    });
  } catch (error) {
    logError("Failed to update logo settings", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to update logo settings",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { message: "Admin access required" },
        { status: 403 }
      );
    }

    await CMSService.resetLogoToDefault();

    const logoSettings = await CMSService.getLogoSettings();

    return NextResponse.json({
      success: true,
      message: "Logo reset to default settings",
      logoSettings,
    });
  } catch (error) {
    logError("Failed to reset logo settings", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { message: "Failed to reset logo settings" },
      { status: 500 }
    );
  }
}
