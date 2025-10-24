import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, slug, isActive, sections = [] } = body;

    console.log(`Creating new page: ${title} with slug: ${slug}`);
    console.log(`Sections to create: ${sections.length}`);

    // Create the page
    const page = await prisma.contentPage.create({
      data: {
        title,
        slug,
        isActive: isActive !== false,
        type: "shop-category",
      },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    console.log(`Created page: ${page.title} (ID: ${page.id})`);

    // Create sections if provided
    if (sections && sections.length > 0) {
      console.log(`Creating ${sections.length} sections`);

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

      // Fetch the page with sections
      const updatedPage = await prisma.contentPage.findUnique({
        where: { id: page.id },
        include: {
          sections: {
            orderBy: { order: "asc" },
          },
        },
      });

      console.log(`Created page with ${updatedPage?.sections.length} sections`);
      return NextResponse.json({ page: updatedPage });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error("Error creating shop page:", error);
    return NextResponse.json(
      { error: "Failed to create shop page" },
      { status: 500 }
    );
  }
}
