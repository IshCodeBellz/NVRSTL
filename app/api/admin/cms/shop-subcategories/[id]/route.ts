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

    const subcategory = await prisma.shopSubcategory.findUnique({
      where: { id },
      include: {
        category: true,
        teams: {
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
    });

    if (!subcategory) {
      return NextResponse.json(
        { error: "Subcategory not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ subcategory });
  } catch (error) {
    console.error("Error fetching shop subcategory:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop subcategory" },
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
    const { slug, name, description, imageUrl, displayOrder, isActive } = body;

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

    const subcategory = await prisma.shopSubcategory.update({
      where: { id },
      data: {
        slug,
        name,
        description,
        imageUrl,
        displayOrder: displayOrder || 0,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({ subcategory });
  } catch (error) {
    console.error("Error updating shop subcategory:", error);
    return NextResponse.json(
      { error: "Failed to update shop subcategory" },
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

    await prisma.shopSubcategory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shop subcategory:", error);
    return NextResponse.json(
      { error: "Failed to delete shop subcategory" },
      { status: 500 }
    );
  }
}
