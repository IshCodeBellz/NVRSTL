import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { brand: string } }
) {
  try {
    const brandSlug = params.brand;

    // Convert slug back to brand name (e.g., "nike" -> "Nike", "ralph-lauren" -> "Ralph Lauren")
    const brandName = brandSlug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Find the brand with its products
    const brand = await prisma.brand.findFirst({
      where: {
        name: {
          equals: brandName,
          mode: "insensitive", // Case-insensitive search
        },
      },
      select: {
        id: true,
        name: true,
        products: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            priceCents: true,
            images: {
              take: 1,
              select: {
                url: true,
              },
              orderBy: {
                position: "asc",
              },
            },
            category: {
              select: {
                name: true,
                slug: true,
              },
            },
            sizeVariants: {
              select: {
                label: true,
              },
              take: 20,
            },
          },
          orderBy: [
            {
              createdAt: "desc", // Newest products first
            },
            {
              name: "asc",
            },
          ],
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Transform the products data
    const transformedProducts = brand.products.map((product) => ({
      id: product.id,
      name: product.name,
      priceCents: product.priceCents,
      image: product.images[0]?.url,
      category: product.category,
      sizes: product.sizeVariants.map((sv) => sv.label),
    }));

    return NextResponse.json({
      brand: {
        id: brand.id,
        name: brand.name,
        products: transformedProducts,
      },
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Failed to fetch brand:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand" },
      { status: 500 }
    );
  }
}
