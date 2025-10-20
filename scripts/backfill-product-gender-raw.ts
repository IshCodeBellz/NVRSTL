import { PrismaClient } from "@prisma/client";

/**
 * Simple backfill script using raw SQL to set gender values
 */
const prisma = new PrismaClient();

async function main() {
  console.log(
    "🔄 Backfilling existing products with gender values using raw SQL..."
  );

  // Set women's products
  const womenResult = await prisma.$executeRaw`
    UPDATE "Product" p
    SET gender = 'women'
    FROM "Category" c
    WHERE p."categoryId" = c.id 
      AND c.slug IN ('womens-clothing', 'women', 'dresses')
      AND p.gender IS NULL;
  `;
  console.log(`✅ Updated ${womenResult} products to gender: women`);

  // Set men's products
  const menResult = await prisma.$executeRaw`
    UPDATE "Product" p
    SET gender = 'men'
    FROM "Category" c
    WHERE p."categoryId" = c.id 
      AND c.slug IN ('mens-clothing', 'men')
      AND p.gender IS NULL;
  `;
  console.log(`✅ Updated ${menResult} products to gender: men`);

  // Set remaining products to unisex
  const unisexResult = await prisma.$executeRaw`
    UPDATE "Product"
    SET gender = 'unisex'
    WHERE gender IS NULL;
  `;
  console.log(`✅ Updated ${unisexResult} products to gender: unisex`);

  // Get summary using raw query
  const summary = await prisma.$queryRaw`
    SELECT gender, COUNT(*) as count
    FROM "Product"
    WHERE gender IS NOT NULL
    GROUP BY gender;
  `;

  console.log(`\n📊 Final gender distribution:`);
  (summary as any[]).forEach((row) => {
    console.log(`  ${row.gender}: ${row.count}`);
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
