import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugBrandsAPI() {
  try {
    console.log("🔍 Debugging brands API query...");

    // Same query as the API
    const brands = await prisma.brand.findMany({
      select: {
        id: true,
        name: true,
        logoUrl: true,
        backgroundImage: true,
        description: true,
        isFeatured: true,
        displayOrder: true,
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: [
        {
          isFeatured: "desc", // Featured brands first
        },
        {
          displayOrder: "asc", // Then by display order
        },
        {
          products: {
            _count: "desc", // Then by product count
          },
        },
        {
          name: "asc", // Finally alphabetically
        },
      ],
    });

    console.log(`Raw brands query result: ${brands.length} brands`);
    brands.forEach((brand) => {
      console.log(
        `- ${brand.name}: ${brand._count.products} products (Featured: ${brand.isFeatured})`
      );
    });

    // Apply the same filter as the API
    const transformedBrands = brands
      .filter((brand) => brand._count.products > 0) // Only include brands with products
      .map((brand) => ({
        id: brand.id,
        name: brand.name,
        logoUrl: brand.logoUrl,
        backgroundImage: brand.backgroundImage,
        description: brand.description,
        isFeatured: brand.isFeatured,
        displayOrder: brand.displayOrder,
        productCount: brand._count.products,
      }));

    console.log(`\nFiltered brands: ${transformedBrands.length} brands`);
    transformedBrands.forEach((brand) => {
      console.log(
        `- ${brand.name}: ${brand.productCount} products (Featured: ${brand.isFeatured})`
      );
    });

    console.log("\nAPI Response:");
    console.log(
      JSON.stringify(
        {
          brands: transformedBrands,
          total: transformedBrands.length,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBrandsAPI();
