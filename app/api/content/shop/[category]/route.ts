import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string } }
) {
  try {
    const { category } = params;
    const slug = `shop/${category}`;

    console.log(`Looking for page with slug: "${slug}"`);

    // First, try to get the CMS content page
    const page = await prisma.contentPage.findUnique({
      where: {
        slug,
        isActive: true,
      },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { order: "asc" },
        },
      },
    });

    // Also fetch the shop category data with subcategories
    const shopCategory = await prisma.shopCategory.findUnique({
      where: {
        slug: category,
        isActive: true,
      },
      include: {
        subcategories: {
          where: { isActive: true },
          include: {
            teams: {
              where: { isActive: true },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    // If we have a CMS page, use it
    if (page) {
      console.log(
        `Page found: "${page.title}" with ${page.sections.length} sections`
      );

      // Enhance the page with shop category data if available
      if (shopCategory) {
        // Add shop category data to the page
        const enhancedPage = {
          ...page,
          shopCategory,
          // Convert subcategories to card sections if no card sections exist
          sections:
            page.sections.length > 0
              ? page.sections
              : shopCategory.subcategories.map((sub, index) => ({
                  id: `subcategory-${sub.id}`,
                  type: "card",
                  title: sub.name,
                  content: sub.description,
                  imageUrl: sub.imageUrl,
                  buttonText: `Shop ${sub.name}`,
                  buttonLink: `/shop/${category}/${sub.slug}`,
                  order: index,
                  isVisible: true,
                })),
        };
        return NextResponse.json({ page: enhancedPage });
      }

      return NextResponse.json({ page });
    }

    // If no CMS page but we have shop category data, create a virtual page
    if (shopCategory) {
      console.log(
        `Shop category found: "${shopCategory.name}" with ${shopCategory.subcategories.length} subcategories`
      );

      const virtualPage = {
        id: `shop-category-${shopCategory.id}`,
        slug,
        title: shopCategory.name,
        type: "shop-category",
        isActive: true,
        description: shopCategory.description,
        sections: shopCategory.subcategories.map((sub, index) => ({
          id: `subcategory-${sub.id}`,
          type: "card",
          title: sub.name,
          content: sub.description,
          imageUrl: sub.imageUrl,
          buttonText: `Shop ${sub.name}`,
          buttonLink: `/shop/${category}/${sub.slug}`,
          order: index,
          isVisible: true,
        })),
        shopCategory,
      };

      return NextResponse.json({ page: virtualPage });
    }

    console.log(`No page or shop category found for slug: "${slug}"`);
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching shop category page:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop category page" },
      { status: 500 }
    );
  }
}
