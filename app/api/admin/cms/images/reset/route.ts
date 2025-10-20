import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { withRequest, error as logError } from "@/lib/server/logger";
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

// Reset homepage images to defaults
export const POST = withRequest(async function POST() {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await CMSService.resetHomepageImagesToDefault();
    const updatedImages = await CMSService.getHomePageImages();
    return NextResponse.json({
      success: true,
      images: updatedImages,
      message: "Images reset to defaults successfully",
    });
  } catch (error) {
    logError("Error resetting homepage images", {
      err: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to reset images" },
      { status: 500 }
    );
  }
});
