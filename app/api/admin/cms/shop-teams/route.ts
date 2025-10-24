import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { ensureAdmin } from "@/lib/server/auth";

export async function GET() {
  try {
    const teams = await prisma.shopTeam.findMany({
      include: {
        subcategory: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        displayOrder: "asc",
      },
    });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Error fetching shop teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop teams" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { subcategoryId, slug, name, description, logoUrl, displayOrder } =
      body;

    if (!subcategoryId || !slug || !name) {
      return NextResponse.json(
        { error: "Subcategory ID, slug and name are required" },
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

    // Validate and clean logo URL if provided
    let cleanLogoUrl = logoUrl;
    if (logoUrl && logoUrl.trim() !== "") {
      // Only validate if it looks like a URL (starts with http/https)
      if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
        try {
          new URL(logoUrl);
        } catch {
          return NextResponse.json(
            { error: "Invalid logo URL format" },
            { status: 400 }
          );
        }
      }
      // If it doesn't start with http/https, treat it as a placeholder and clear it
      else {
        cleanLogoUrl = "";
      }
    }

    const team = await prisma.shopTeam.create({
      data: {
        subcategoryId,
        slug,
        name,
        description,
        logoUrl: cleanLogoUrl,
        displayOrder: displayOrder || 0,
      },
    });

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error creating shop team:", error);
    return NextResponse.json(
      { error: "Failed to create shop team" },
      { status: 500 }
    );
  }
}
