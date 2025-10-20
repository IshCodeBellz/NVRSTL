import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function makeBrandsFeatured() {
  try {
    console.log("🌟 Making brands featured...");

    // Update brands that have products to be featured
    const brandsToFeature = [
      { name: "Nike", displayOrder: 1 },
      { name: "Adidas", displayOrder: 2 },
      { name: "H&M", displayOrder: 3 },
      { name: "ASOS Design", displayOrder: 4 },
    ];

    for (const brandData of brandsToFeature) {
      const updated = await prisma.brand.update({
        where: { name: brandData.name },
        data: {
          isFeatured: true,
          displayOrder: brandData.displayOrder,
          logoUrl: `https://images.unsplash.com/photo-154229102${brandData.displayOrder}-7eec264c27ff?w=200&h=100&fit=crop&crop=center`,
          backgroundImage: `https://images.unsplash.com/photo-154229102${brandData.displayOrder}-7eec264c27ff?w=800&h=400&fit=crop&crop=center`,
          description: `${brandData.name} brings the latest fashion trends and high-quality products for modern lifestyles.`,
        },
      });

      console.log(`✅ ⭐ Featured: ${updated.name} (${updated.displayOrder})`);
    }

    // Check results
    const featuredBrands = await prisma.brand.findMany({
      where: { isFeatured: true },
      include: {
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
      orderBy: { displayOrder: "asc" },
    });

    console.log(`\n🎉 Featured brands setup complete!`);
    console.log(`⭐ Featured brands: ${featuredBrands.length}`);

    featuredBrands.forEach((brand) => {
      console.log(
        `  ⭐ ${brand.name} - ${brand._count.products} products (Order: ${brand.displayOrder})`
      );
    });
  } catch (error) {
    console.error("❌ Error updating brands:", error);
  } finally {
    await prisma.$disconnect();
  }
}

makeBrandsFeatured();
