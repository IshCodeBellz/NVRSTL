// Force local database URL to match API
process.env.DATABASE_URL = "postgresql://ishaqbello@localhost:5432/test_db";

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function debugUnified() {
  try {
    console.log("🔍 Using LOCAL database (same as API)...");
    console.log(
      "🔗 DATABASE_URL:",
      process.env.DATABASE_URL?.substring(0, 50) + "..."
    );

    // Same exact queries as the API
    const totalBrands = await prisma.brand.count();
    console.log(`📊 Total brands in DB: ${totalBrands}`);

    const totalProducts = await prisma.product.count({
      where: {
        isActive: true,
        deletedAt: null,
      },
    });
    console.log(`📦 Total active products in DB: ${totalProducts}`);

    // Check products with brand info
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        brandId: true,
        brand: {
          select: {
            name: true,
          },
        },
        isActive: true,
        deletedAt: true,
      },
    });

    console.log(`📋 Products found: ${products.length}`);
    products.forEach((product) => {
      console.log(
        `  - ${product.name} (Brand ID: ${product.brandId}, Brand: ${
          product.brand?.name || "None"
        })`
      );
    });

    // Same brand query as API
    const brands = await prisma.brand.findMany({
      select: {
        id: true,
        name: true,
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
    });

    console.log(`\n🏷️ Brands with product counts:`);
    brands.forEach((brand) => {
      console.log(`  - ${brand.name}: ${brand._count.products} products`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUnified();
