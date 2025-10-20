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

// Get all content pages
export const GET = withRequest(async function GET() {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pages = await CMSService.getAllPages();
    return NextResponse.json({ pages });
  } catch (error) {
    logger.error("Error fetching CMS pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 }
    );
  }
});

// Create or update a content page
export const POST = withRequest(async function POST(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, slug, title, type, isActive = true, sections = [] } = body;

    // Validate required fields
    if (!slug || !title || !type) {
      return NextResponse.json(
        { error: "Missing required fields: slug, title, type" },
        { status: 400 }
      );
    }

    const page = await CMSService.savePage({
      id,
      slug,
      title,
      type,
      isActive,
      sections,
    });

    return NextResponse.json({ page });
  } catch (error) {
    logger.error("Error saving CMS page:", error);
    return NextResponse.json({ error: "Failed to save page" }, { status: 500 });
  }
});

// Delete a content page
export const DELETE = withRequest(async function DELETE(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Page ID is required" },
        { status: 400 }
      );
    }

    const success = await CMSService.deletePage(id);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete page" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting CMS page:", error);
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 }
    );
  }
});
