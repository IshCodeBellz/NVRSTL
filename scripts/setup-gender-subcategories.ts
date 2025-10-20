import { PrismaClient } from "@prisma/client";

/**
 * Setup gender-specific subcategories for better organization
 * This script creates common men's and women's subcategories
 */
const prisma = new PrismaClient();

// Define the subcategories we want to create
const subcategories = [
  // Women's subcategories
  { name: "Women's Dresses", slug: "women-dresses" },
  { name: "Women's Tops", slug: "women-tops" },
  { name: "Women's Bottoms", slug: "women-bottoms" },
  { name: "Women's Shoes", slug: "women-shoes" },
  { name: "Women's Accessories", slug: "women-accessories" },
  { name: "Women's Outerwear", slug: "women-outerwear" },
  { name: "Women's Activewear", slug: "women-activewear" },

  // Men's subcategories
  { name: "Men's Shirts", slug: "men-shirts" },
  { name: "Men's Pants", slug: "men-pants" },
  { name: "Men's Suits", slug: "men-suits" },
  { name: "Men's Shoes", slug: "men-shoes" },
  { name: "Men's Accessories", slug: "men-accessories" },
  { name: "Men's Outerwear", slug: "men-outerwear" },
  { name: "Men's Activewear", slug: "men-activewear" },

  // Unisex subcategories
  { name: "Unisex Accessories", slug: "unisex-accessories" },
  { name: "Unisex Activewear", slug: "unisex-activewear" },
  { name: "Unisex Outerwear", slug: "unisex-outerwear" },
];

async function main() {
  console.log("🏗️  Setting up gender-specific subcategories...\n");

  let created = 0;
  let skipped = 0;

  for (const category of subcategories) {
    try {
      // Check if category already exists
      const existing = await prisma.category.findFirst({
        where: {
          OR: [{ slug: category.slug }, { name: category.name }],
        },
      });

      if (existing) {
        console.log(`⏭️  Skipped: ${category.name} (already exists)`);
        skipped++;
        continue;
      }

      // Create the category
      const newCategory = await prisma.category.create({
        data: {
          name: category.name,
          slug: category.slug,
        },
      });

      console.log(`✅ Created: ${newCategory.name} (${newCategory.slug})`);
      created++;
    } catch (error) {
      console.error("Error:", error);
      console.error(`❌ Failed to create ${category.name}:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created} new subcategories`);
  console.log(`   Skipped: ${skipped} existing subcategories`);
  console.log(`   Total subcategories: ${created + skipped}`);

  // Show current category count
  const totalCategories = await prisma.category.count();
  console.log(`   Database now has: ${totalCategories} total categories\n`);

  console.log("🎉 Gender-specific subcategories setup complete!");
  console.log("\n📍 Next steps:");
  console.log("   1. Visit /admin/categories to see your new subcategories");
  console.log(
    "   2. Use /admin/products to assign products to these categories"
  );
  console.log("   3. Navigation URLs like /women/dresses will now work!");
}

main()
  .catch((e) => {
    console.error("❌ Setup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
