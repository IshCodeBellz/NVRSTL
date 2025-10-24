import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = params;

    const page = await prisma.contentPage.findUnique({
      where: { slug },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error("Error fetching shop page:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop page" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = params;
    const body = await request.json();
    const { title, isActive, sections = [] } = body;

    // Check if page exists
    const existingPage = await prisma.contentPage.findUnique({
      where: { slug },
    });

    if (!existingPage) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Update the page and its sections
    const page = await prisma.contentPage.update({
      where: { slug },
      data: {
        title,
        isActive,
        sections: {
          deleteMany: {}, // Delete all existing sections
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
    console.error("Error updating shop page:", error);
    return NextResponse.json(
      { error: "Failed to update shop page" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = params;

    // Check if page exists
    const existingPage = await prisma.contentPage.findUnique({
      where: { slug },
    });

    if (!existingPage) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Delete the page (sections will be deleted automatically due to cascade)
    await prisma.contentPage.delete({
      where: { slug },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shop page:", error);
    return NextResponse.json(
      { error: "Failed to delete shop page" },
      { status: 500 }
    );
  }
}
