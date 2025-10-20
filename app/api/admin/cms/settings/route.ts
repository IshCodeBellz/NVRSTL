import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { logger, withRequest } from "@/lib/server/logger";
import { CMSService } from "@/lib/server/cmsService";

export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const session = await getServerSession(authOptionsEnhanced);
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.isAdmin) return null;
  return user;
}

// Get site settings
export const GET = withRequest(async function GET() {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await CMSService.getSiteSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    logger.error("Error fetching site settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
});

// Update site settings
export const POST = withRequest(async function POST(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "Invalid settings data" },
        { status: 400 }
      );
    }

    const updatedSettings = await CMSService.updateSiteSettings(settings);
    return NextResponse.json({ settings: updatedSettings });
  } catch (error) {
    logger.error("Error updating site settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
});
