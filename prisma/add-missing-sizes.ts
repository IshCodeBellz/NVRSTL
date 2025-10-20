import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sizeVariantsByCategory = {
  "womens-clothing": ["XS", "S", "M", "L", "XL", "XXL"],
  "mens-clothing": ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
  sportswear: ["XS", "S", "M", "L", "XL", "XXL"],
  footwear: ["6", "7", "8", "9", "10", "11", "12"],
  accessories: ["One Size"],
  dresses: ["XS", "S", "M", "L", "XL", "XXL"],
  denim: ["XS", "S", "M", "L", "XL", "XXL"],
};

async function addMissingSizeVariants() {
  console.log("🔍 Finding products without size variants...");

  // Find products without size variants
  const productsWithoutSizes = await prisma.product.findMany({
    where: {
      deletedAt: null,
      sizeVariants: {
        none: {},
      },
    },
    include: {
      category: true,
    },
  });

  console.log(
    `Found ${productsWithoutSizes.length} products without size variants`
  );

  for (const product of productsWithoutSizes) {
    const categorySlug = product.category?.slug || "accessories";
    const sizes = sizeVariantsByCategory[
      categorySlug as keyof typeof sizeVariantsByCategory
    ] || ["One Size"];

    console.log(
      `Adding sizes to "${product.name}" (${categorySlug}): ${sizes.join(", ")}`
    );

    try {
      // Create size variants for this product
      for (const size of sizes) {
        await prisma.sizeVariant.create({
          data: {
            productId: product.id,
            label: size,
            stock: Math.floor(Math.random() * 50) + 10, // 10-59 items in stock
          },
        });
      }

      console.log(
        `✅ Added ${sizes.length} size variants to "${product.name}"`
      );
    } catch (error) {
      console.error("Error:", error);
      console.error(`❌ Failed to add sizes to "${product.name}":`, error);
    }
  }

  // Verify the fix
  const remainingWithoutSizes = await prisma.product.count({
    where: {
      deletedAt: null,
      sizeVariants: {
        none: {},
      },
    },
  });

  console.log(`\n📊 Results:`);
  console.log(`   Products processed: ${productsWithoutSizes.length}`);
  console.log(`   Products still without sizes: ${remainingWithoutSizes}`);
  console.log(
    `   ${
      remainingWithoutSizes === 0
        ? "✅ All products now have size variants!"
        : "⚠️ Some products still missing sizes"
    }`
  );
}

async function main() {
  try {
    await addMissingSizeVariants();
  } catch (error) {
      console.error("Error:", error);
    console.error("❌ Error adding size variants:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
