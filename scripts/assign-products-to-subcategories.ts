import { PrismaClient } from "@prisma/client";

/**
 * Intelligently assign existing products to gender-specific subcategories
 * This script analyzes product names and current categories to make smart assignments
 */
const prisma = new PrismaClient();

// Category mapping based on product name keywords
const categoryMappings = {
  // Women's category mappings
  women: {
    dress: "women-dresses",
    gown: "women-dresses",
    "slip dress": "women-dresses",

    top: "women-tops",
    blouse: "women-tops",
    shirt: "women-tops",
    tee: "women-tops",
    tank: "women-tops",

    pant: "women-bottoms",
    jean: "women-bottoms",
    trouser: "women-bottoms",
    skirt: "women-bottoms",
    short: "women-bottoms",

    shoe: "women-shoes",
    boot: "women-shoes",
    sneaker: "women-shoes",
    heel: "women-shoes",
    sandal: "women-shoes",

    bag: "women-accessories",
    purse: "women-accessories",
    jewelry: "women-accessories",
    necklace: "women-accessories",
    earring: "women-accessories",
    bracelet: "women-accessories",

    jacket: "women-outerwear",
    coat: "women-outerwear",
    blazer: "women-outerwear",
    cardigan: "women-outerwear",

    athletic: "women-activewear",
    sport: "women-activewear",
    yoga: "women-activewear",
    gym: "women-activewear",
    active: "women-activewear",
  },

  // Men's category mappings
  men: {
    shirt: "men-shirts",
    tee: "men-shirts",
    polo: "men-shirts",
    button: "men-shirts",

    pant: "men-pants",
    trouser: "men-pants",
    jean: "men-pants",
    chino: "men-pants",
    short: "men-pants",

    suit: "men-suits",
    blazer: "men-suits",
    formal: "men-suits",

    shoe: "men-shoes",
    boot: "men-shoes",
    sneaker: "men-shoes",
    loafer: "men-shoes",
    oxford: "men-shoes",

    watch: "men-accessories",
    wallet: "men-accessories",
    belt: "men-accessories",
    tie: "men-accessories",
    cufflink: "men-accessories",

    jacket: "men-outerwear",
    coat: "men-outerwear",
    hoodie: "men-outerwear",
    sweater: "men-outerwear",

    athletic: "men-activewear",
    sport: "men-activewear",
    gym: "men-activewear",
    active: "men-activewear",
  },

  // Unisex category mappings
  unisex: {
    cap: "unisex-accessories",
    hat: "unisex-accessories",
    sunglasses: "unisex-accessories",
    bag: "unisex-accessories",
    backpack: "unisex-accessories",

    athletic: "unisex-activewear",
    sport: "unisex-activewear",
    gym: "unisex-activewear",
    active: "unisex-activewear",
    track: "unisex-activewear",

    jacket: "unisex-outerwear",
    coat: "unisex-outerwear",
    windbreaker: "unisex-outerwear",
    hoodie: "unisex-outerwear",
  },
};

async function findBestCategory(
  productName: string,
  productGender: string | null
): Promise<string | null> {
  const name = productName.toLowerCase();
  const gender = productGender || "unisex";

  // Get the appropriate mapping based on gender
  const genderMappings =
    categoryMappings[gender as keyof typeof categoryMappings];
  if (!genderMappings) return null;

  // Find the best match based on keywords
  for (const [keyword, categorySlug] of Object.entries(genderMappings)) {
    if (name.includes(keyword.toLowerCase())) {
      return categorySlug;
    }
  }

  return null;
}

async function main() {
  console.log("🔄 Assigning products to gender-specific subcategories...\n");

  // Get all products that need category assignment
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      gender: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  console.log(`📦 Found ${products.length} products to analyze\n`);

  let assigned = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of products) {
    try {
      // Find the best subcategory for this product
      const bestCategorySlug = await findBestCategory(
        product.name,
        product.gender
      );

      if (!bestCategorySlug) {
        console.log(
          `⏭️  Skipped: "${product.name}" - no matching subcategory found`
        );
        skipped++;
        continue;
      }

      // Find the new category
      const newCategory = await prisma.category.findUnique({
        where: { slug: bestCategorySlug },
      });

      if (!newCategory) {
        console.log(
          `❌ Error: Category "${bestCategorySlug}" not found for "${product.name}"`
        );
        errors++;
        continue;
      }

      // Skip if already assigned to this category
      if (product.category?.id === newCategory.id) {
        console.log(
          `⏭️  Skipped: "${product.name}" - already in ${newCategory.name}`
        );
        skipped++;
        continue;
      }

      // Update the product's category
      await prisma.product.update({
        where: { id: product.id },
        data: { categoryId: newCategory.id },
      });

      const oldCategory = product.category?.name || "None";
      console.log(`✅ Assigned: "${product.name}"`);
      console.log(`   ${oldCategory} → ${newCategory.name}`);
      assigned++;
    } catch (error) {
      console.error("Error:", error);
      console.error(`❌ Failed to assign "${product.name}":`, error);
      errors++;
    }
  }

  console.log(`\n📊 Assignment Summary:`);
  console.log(`   Assigned: ${assigned} products`);
  console.log(`   Skipped: ${skipped} products`);
  console.log(`   Errors: ${errors} products`);
  console.log(`   Total processed: ${assigned + skipped + errors}`);

  // Show category distribution
  console.log(`\n📈 New Category Distribution:`);
  const categoryStats = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  });

  categoryStats
    .filter((cat) => cat._count.products > 0)
    .forEach((cat) => {
      console.log(`   ${cat.name}: ${cat._count.products} products`);
    });

  console.log("\n🎉 Product assignment complete!");
  console.log("\n📍 What's next:");
  console.log("   1. Visit /admin/categories to see the updated distribution");
  console.log("   2. Test navigation URLs like /women/dresses, /men/shirts");
  console.log("   3. Products will now be filtered by gender AND subcategory!");
}

main()
  .catch((e) => {
    console.error("❌ Assignment failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
