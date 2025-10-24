import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced as authOptions } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all shop-related pages
    const shopPages = await prisma.contentPage.findMany({
      where: {
        type: {
          in: ["shop", "shop-category"],
        },
      },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { slug: "asc" },
    });

    return NextResponse.json({ pages: shopPages });
  } catch (error) {
    console.error("Error fetching shop pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop pages" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { slug, title, type, isActive = true, sections = [] } = body;

    // Validate required fields
    if (!slug || !title || !type) {
      return NextResponse.json(
        { error: "Missing required fields: slug, title, type" },
        { status: 400 }
      );
    }

    // Validate type
    if (!["shop", "shop-category"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'shop' or 'shop-category'" },
        { status: 400 }
      );
    }

    // Check if page already exists
    const existingPage = await prisma.contentPage.findUnique({
      where: { slug },
    });

    if (existingPage) {
      return NextResponse.json(
        { error: "Page with this slug already exists" },
        { status: 400 }
      );
    }

    // Create the page with sections
    const page = await prisma.contentPage.create({
      data: {
        slug,
        title,
        type,
        isActive,
        sections: {
          create: sections.map((section: any, index: number) => ({
            type: section.type || "text",
            title: section.title,
            subtitle: section.subtitle,
            content: section.content || "",
            imageUrl: section.imageUrl,
            buttonText: section.buttonText,
            buttonLink: section.buttonLink,
            order: section.order || index,
            isVisible: section.isVisible !== false,
          })),
        },
      },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ page });
  } catch (error) {
    console.error("Error creating shop page:", error);
    return NextResponse.json(
      { error: "Failed to create shop page" },
      { status: 500 }
    );
  }
}
