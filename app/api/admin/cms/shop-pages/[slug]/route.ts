import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced as authOptions } from "@/lib/server/authOptionsEnhanced";
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

    // Handle both ID and slug lookups
    const page = await prisma.contentPage.findFirst({
      where: {
        OR: [{ id: slug }, { slug: slug }],
      },
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

    // Handle both ID and slug lookups
    const existingPage = await prisma.contentPage.findFirst({
      where: {
        OR: [{ id: slug }, { slug: slug }],
      },
    });

    if (!existingPage) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Update the page
    const page = await prisma.contentPage.update({
      where: { id: existingPage.id },
      data: {
        title,
        isActive,
      },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    // Only update sections if they are provided
    if (sections && sections.length > 0) {
      // Delete all existing sections
      await prisma.contentSection.deleteMany({
        where: { pageId: page.id },
      });

      // Create new sections
      await prisma.contentSection.createMany({
        data: sections.map((section: any, index: number) => ({
          pageId: page.id,
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
      });

      // Fetch the updated page with sections
      const updatedPage = await prisma.contentPage.findUnique({
        where: { id: page.id },
        include: {
          sections: {
            orderBy: { order: "asc" },
          },
        },
      });

      return NextResponse.json({ page: updatedPage });
    }

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
