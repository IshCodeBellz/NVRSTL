import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedBrands() {
  try {
    console.log("🌱 Seeding brands...");

    // Create or update featured brands
    const brands = [
      {
        name: "Nike",
        logoUrl:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=100&fit=crop&crop=center",
        backgroundImage:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=400&fit=crop&crop=center",
        description:
          "Just Do It. Nike brings innovation and inspiration to every athlete in the world.",
        isFeatured: true,
        displayOrder: 1,
      },
      {
        name: "Adidas",
        logoUrl:
          "https://cdn.logojoy.com/wp-content/uploads/20231013154326/Adidas-logo-1971.png",
        backgroundImage:
          "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=400&fit=crop&crop=center",
        description:
          "Impossible is Nothing. Adidas creates sports apparel and footwear for athletes and enthusiasts.",
        isFeatured: true,
        displayOrder: 2,
      },
      {
        name: "Zara",
        logoUrl:
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=100&fit=crop&crop=center",
        backgroundImage:
          "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=400&fit=crop&crop=center",
        description:
          "Zara brings the latest fashion trends with affordable luxury and contemporary styles.",
        isFeatured: true,
        displayOrder: 3,
      },
      {
        name: "H&M",
        logoUrl:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=100&fit=crop&crop=center",
        backgroundImage:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=400&fit=crop&crop=center",
        description:
          "Fashion and quality at the best price in a sustainable way.",
        isFeatured: true,
        displayOrder: 4,
      },
      {
        name: "Uniqlo",
        logoUrl:
          "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=200&h=100&fit=crop&crop=center",
        backgroundImage:
          "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&h=400&fit=crop&crop=center",
        description:
          "LifeWear made from innovative, high-quality, functional, and universal clothing.",
        isFeatured: false,
        displayOrder: 5,
      },
      {
        name: "Puma",
        logoUrl:
          "https://images.unsplash.com/photo-1544966503-7cc5ac882d5d?w=200&h=100&fit=crop&crop=center",
        backgroundImage:
          "https://images.unsplash.com/photo-1544966503-7cc5ac882d5d?w=800&h=400&fit=crop&crop=center",
        description:
          "Forever Faster. Puma provides sports-inspired lifestyle products.",
        isFeatured: false,
        displayOrder: 6,
      },
    ];

    for (const brandData of brands) {
      const brand = await prisma.brand.upsert({
        where: { name: brandData.name },
        update: {
          logoUrl: brandData.logoUrl,
          backgroundImage: brandData.backgroundImage,
          description: brandData.description,
          isFeatured: brandData.isFeatured,
          displayOrder: brandData.displayOrder,
        },
        create: brandData,
      });

      console.log(
        `✅ ${brand.isFeatured ? "⭐ Featured" : "📦"} Brand: ${brand.name}`
      );
    }

    // Check results
    const totalBrands = await prisma.brand.count();
    const featuredCount = await prisma.brand.count({
      where: { isFeatured: true },
    });

    console.log(`\n🎉 Seeding complete!`);
    console.log(`📊 Total brands: ${totalBrands}`);
    console.log(`⭐ Featured brands: ${featuredCount}`);

    // Show all brands
    const allBrands = await prisma.brand.findMany({
      orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }],
    });

    console.log("\n📋 All brands:");
    allBrands.forEach((brand) => {
      console.log(
        `  ${brand.isFeatured ? "⭐" : "📦"} ${brand.name} (Order: ${
          brand.displayOrder
        })`
      );
    });
  } catch (error) {
    console.error("❌ Error seeding brands:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedBrands();
