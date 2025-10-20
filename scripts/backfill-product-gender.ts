import { PrismaClient } from "@prisma/client";

/**
 * Backfill existing products with appropriate gender values based on their category
 */
const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Backfilling existing products with gender values...");

  // Set women's products
  const womenUpdate = await prisma.product.updateMany({
    where: {
      category: {
        slug: {
          in: ["womens-clothing", "women", "dresses"],
        },
      },
      gender: null,
    },
    data: {
      gender: "women",
    },
  });

  console.log(`✅ Updated ${womenUpdate.count} products to gender: women`);

  // Set men's products
  const menUpdate = await prisma.product.updateMany({
    where: {
      category: {
        slug: {
          in: ["mens-clothing", "men"],
        },
      },
      gender: null,
    },
    data: {
      gender: "men",
    },
  });

  console.log(`✅ Updated ${menUpdate.count} products to gender: men`);

  // Set remaining products to unisex
  const unisexUpdate = await prisma.product.updateMany({
    where: {
      gender: null,
    },
    data: {
      gender: "unisex",
    },
  });

  console.log(`✅ Updated ${unisexUpdate.count} products to gender: unisex`);

  // Summary
  const totalProducts = await prisma.product.count();
  const genderCounts = await prisma.product.groupBy({
    by: ["gender"],
    _count: { gender: true },
  });

  console.log(`\n📊 Final gender distribution (${totalProducts} total):`);
  genderCounts.forEach((group) => {
    console.log(`  ${group.gender}: ${group._count.gender}`);
  });

  console.log("\n✅ Backfill complete!");
}

main()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
