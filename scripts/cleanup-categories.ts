import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupCategories() {
  try {
    console.log("🧹 Starting category cleanup...");

    // Find all categories
    const allCategories = await prisma.category.findMany({
      include: {
        products: true,
        children: true,
        parent: true,
      },
    });

    console.log(`📊 Found ${allCategories.length} categories`);

    // Find duplicates to remove
    const categoriesToRemove = allCategories.filter(
      (cat) =>
        cat.slug.endsWith("-clothing") ||
        cat.slug === "womens-clothing" ||
        cat.slug === "mens-clothing"
    );

    console.log(
      `🗑️  Categories to remove:`,
      categoriesToRemove.map((c) => `${c.name} (${c.slug})`)
    );

    // Remove the duplicate categories
    for (const category of categoriesToRemove) {
      // First, move any products to the correct parent category
      if (category.products.length > 0) {
        const correctCategory = allCategories.find(
          (c) =>
            (category.slug === "womens-clothing" && c.slug === "womens") ||
            (category.slug === "mens-clothing" && c.slug === "mens")
        );

        if (correctCategory) {
          console.log(
            `📦 Moving ${category.products.length} products from ${category.name} to ${correctCategory.name}`
          );
          await prisma.product.updateMany({
            where: { categoryId: category.id },
            data: { categoryId: correctCategory.id },
          });
        }
      }

      // Move any subcategories to the correct parent
      if (category.children.length > 0) {
        const correctCategory = allCategories.find(
          (c) =>
            (category.slug === "womens-clothing" && c.slug === "womens") ||
            (category.slug === "mens-clothing" && c.slug === "mens")
        );

        if (correctCategory) {
          console.log(
            `📁 Moving ${category.children.length} subcategories from ${category.name} to ${correctCategory.name}`
          );
          await prisma.category.updateMany({
            where: { parentId: category.id },
            data: { parentId: correctCategory.id },
          });
        }
      }

      // Delete the duplicate category
      console.log(`❌ Deleting category: ${category.name} (${category.slug})`);
      await prisma.category.delete({
        where: { id: category.id },
      });
    }

    console.log("✅ Category cleanup completed!");

    // Show final categories
    const finalCategories = await prisma.category.findMany({
      orderBy: [{ parentId: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
    });

    console.log("📋 Final categories:");
    const mainCategories = finalCategories.filter((c) => !c.parentId);
    for (const main of mainCategories) {
      console.log(`  ▶ ${main.name} (${main.slug})`);
      const subs = finalCategories.filter((c) => c.parentId === main.id);
      for (const sub of subs) {
        console.log(`    ↳ ${sub.name} (${sub.slug})`);
      }
    }
  } catch (error) {
      console.error("Error:", error);
    console.error("❌ Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupCategories();
