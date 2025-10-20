// Force local database URL
process.env.DATABASE_URL = "postgresql://ishaqbello@localhost:5432/test_db";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedLocalDatabase() {
  try {
    console.log("🌱 Seeding LOCAL database (same as API)...");
    console.log(
      "🔗 DATABASE_URL:",
      process.env.DATABASE_URL?.substring(0, 50) + "..."
    );

    // Clear existing data
    console.log("🧹 Cleaning existing data...");
    await prisma.product.deleteMany();
    await prisma.brand.deleteMany();

    // Create brands
    console.log("Creating brands...");
    const brands = await prisma.brand.createMany({
      data: [
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
          name: "H&M",
          logoUrl:
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=100&fit=crop&crop=center",
          backgroundImage:
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=400&fit=crop&crop=center",
          description:
            "Fashion and quality at the best price in a sustainable way.",
          isFeatured: true,
          displayOrder: 3,
        },
        {
          name: "ASOS Design",
          logoUrl:
            "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=200&h=100&fit=crop&crop=center",
          backgroundImage:
            "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&h=400&fit=crop&crop=center",
          description:
            "Fashion-forward clothing and accessories for the modern lifestyle.",
          isFeatured: true,
          displayOrder: 4,
        },
        {
          name: "Zara",
          logoUrl:
            "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=100&fit=crop&crop=center",
          backgroundImage:
            "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=400&fit=crop&crop=center",
          description:
            "Zara brings the latest fashion trends with affordable luxury and contemporary styles.",
          isFeatured: false,
          displayOrder: 5,
        },
      ],
    });

    console.log(`✅ Created ${brands.count} brands`);

    // Get brand IDs for product creation
    const createdBrands = await prisma.brand.findMany();
    const nikeBrand = createdBrands.find((b) => b.name === "Nike");
    const adidasBrand = createdBrands.find((b) => b.name === "Adidas");
    const hmBrand = createdBrands.find((b) => b.name === "H&M");
    const asosBrand = createdBrands.find((b) => b.name === "ASOS Design");

    // Create products with brand associations
    console.log("Creating products with brand associations...");
    const products = await prisma.product.createMany({
      data: [
        {
          sku: "NIKE-001",
          name: "Air Max Sneakers",
          description: "Classic Nike Air Max sneakers with modern comfort.",
          priceCents: 12000,
          brandId: nikeBrand?.id,
          isActive: true,
        },
        {
          sku: "NIKE-002",
          name: "Nike Running Shirt",
          description: "Lightweight running shirt with Dri-FIT technology.",
          priceCents: 4500,
          brandId: nikeBrand?.id,
          isActive: true,
        },
        {
          sku: "ADIDAS-001",
          name: "Ultraboost Shoes",
          description: "Adidas Ultraboost running shoes with Boost technology.",
          priceCents: 18000,
          brandId: adidasBrand?.id,
          isActive: true,
        },
        {
          sku: "HM-001",
          name: "Cotton T-Shirt",
          description: "Basic cotton T-shirt in various colors.",
          priceCents: 1500,
          brandId: hmBrand?.id,
          isActive: true,
        },
        {
          sku: "ASOS-001",
          name: "Designer Jeans",
          description: "Stylish slim-fit jeans with premium denim.",
          priceCents: 8000,
          brandId: asosBrand?.id,
          isActive: true,
        },
        {
          sku: "ASOS-002",
          name: "Summer Dress",
          description: "Floral summer dress perfect for warm weather.",
          priceCents: 6500,
          brandId: asosBrand?.id,
          isActive: true,
        },
      ],
    });

    console.log(`✅ Created ${products.count} products`);

    // Verify the results
    const finalBrands = await prisma.brand.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    const finalProducts = await prisma.product.count({
      where: { isActive: true, deletedAt: null },
    });

    console.log(`\n🎉 Local database seeding complete!`);
    console.log(`📊 Final state:`);
    console.log(`  - Brands: ${finalBrands.length}`);
    console.log(`  - Products: ${finalProducts}`);

    console.log(`\n🏷️ Brands with product counts:`);
    finalBrands.forEach((brand) => {
      console.log(
        `  - ${brand.name}: ${brand._count.products} products ${
          brand.isFeatured ? "⭐" : ""
        }`
      );
    });
  } catch (error) {
    console.error("❌ Error seeding local database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedLocalDatabase();
