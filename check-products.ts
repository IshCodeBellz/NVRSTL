import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.product.findMany({
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
      take: 10,
    });

    console.log(`Total products: ${products.length}`);
    console.log("Sample products:");
    products.forEach((product) => {
      console.log(
        `- ${product.name} (Brand: ${
          product.brand?.name || "No brand"
        }, Active: ${product.isActive}, Deleted: ${
          product.deletedAt ? "Yes" : "No"
        })`
      );
    });

    // Check products by brand
    const brands = await prisma.brand.findMany({
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
    });

    console.log("\nProducts per brand:");
    brands.forEach((brand) => {
      console.log(`- ${brand.name}: ${brand._count.products} active products`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
