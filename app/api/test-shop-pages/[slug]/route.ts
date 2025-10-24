import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const body = await request.json();
    const { title, isActive, sections = [] } = body;

    console.log(`Updating page with slug/ID: ${slug}`);
    console.log(`Sections to update: ${sections.length}`);

    // Handle both ID and slug lookups
    const existingPage = await prisma.contentPage.findFirst({
      where: {
        OR: [{ id: slug }, { slug: slug }],
      },
    });

    if (!existingPage) {
      console.log(`Page not found for slug/ID: ${slug}`);
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    console.log(`Found page: ${existingPage.title} (ID: ${existingPage.id})`);

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
      console.log(`Deleting ${page.sections.length} existing sections`);

      // Delete all existing sections
      await prisma.contentSection.deleteMany({
        where: { pageId: page.id },
      });

      console.log(`Creating ${sections.length} new sections`);

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

      console.log(`Updated page with ${updatedPage?.sections.length} sections`);
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
