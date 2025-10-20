import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function assignProductsToZara() {
  try {
    // Find Zara brand
    const zara = await prisma.brand.findUnique({
      where: { name: "Zara" },
    });

    if (!zara) {
      console.log("Zara brand not found");
      return;
    }

    // Get some products that don't have a brand assigned
    const products = await prisma.product.findMany({
      where: {
        brandId: null,
        isActive: true,
        deletedAt: null,
      },
      take: 3,
    });

    console.log(`Found ${products.length} products without brands`);

    // Assign them to Zara
    for (const product of products) {
      await prisma.product.update({
        where: { id: product.id },
        data: { brandId: zara.id },
      });
      console.log(`Assigned product "${product.name}" to Zara`);
    }

    console.log("Successfully assigned products to Zara");
  } catch (error) {
      console.error("Error:", error);
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

assignProductsToZara();
