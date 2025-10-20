import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkBrands() {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    console.log("Brands in database:");
    console.log("Total brands:", brands.length);

    brands.forEach((brand) => {
      console.log(
        `- ${brand.name} (Featured: ${brand.isFeatured}, Products: ${brand._count.products}, Display Order: ${brand.displayOrder})`
      );
      if (brand.logoUrl) console.log(`  Logo: ${brand.logoUrl}`);
      if (brand.backgroundImage)
        console.log(`  Background: ${brand.backgroundImage}`);
      if (brand.description) console.log(`  Description: ${brand.description}`);
    });

    // Check featured brands specifically
    const featuredBrands = brands.filter((b) => b.isFeatured);
    console.log("\nFeatured brands:", featuredBrands.length);
    featuredBrands.forEach((brand) => {
      console.log(`- ${brand.name} (Display Order: ${brand.displayOrder})`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBrands();
