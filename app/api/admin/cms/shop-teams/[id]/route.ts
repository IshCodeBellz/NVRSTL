import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { ensureAdmin } from "@/lib/server/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;

    const team = await prisma.shopTeam.findUnique({
      where: { id },
      include: {
        subcategory: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error fetching shop team:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop team" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await request.json();
    const { slug, name, description, logoUrl, displayOrder, isActive } = body;

    if (!slug || !name) {
      return NextResponse.json(
        { error: "Slug and name are required" },
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

    // Validate logo URL if provided
    if (logoUrl && logoUrl.trim() !== "") {
      try {
        new URL(logoUrl);
      } catch {
        return NextResponse.json(
          { error: "Invalid logo URL format" },
          { status: 400 }
        );
      }
    }

    const team = await prisma.shopTeam.update({
      where: { id },
      data: {
        slug,
        name,
        description,
        logoUrl,
        displayOrder: displayOrder || 0,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error updating shop team:", error);
    return NextResponse.json(
      { error: "Failed to update shop team" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;

    await prisma.shopTeam.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shop team:", error);
    return NextResponse.json(
      { error: "Failed to delete shop team" },
      { status: 500 }
    );
  }
}
