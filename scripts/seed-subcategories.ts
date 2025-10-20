import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedSubcategories() {
  try {
    console.log("🌱 Starting subcategories seed...");

    // Create main categories first
    const womensCategory = await prisma.category.upsert({
      where: { slug: "womens" },
      update: {},
      create: {
        name: "Women's",
        slug: "womens",
        description: "Women's fashion and accessories",
        displayOrder: 1,
        isActive: true,
      },
    });

    const mensCategory = await prisma.category.upsert({
      where: { slug: "mens" },
      update: {},
      create: {
        name: "Men's",
        slug: "mens",
        description: "Men's fashion and accessories",
        displayOrder: 2,
        isActive: true,
      },
    });

    const shoesCategory = await prisma.category.upsert({
      where: { slug: "shoes" },
      update: {},
      create: {
        name: "Shoes",
        slug: "shoes",
        description: "Footwear for all occasions",
        displayOrder: 3,
        isActive: true,
      },
    });

    const accessoriesCategory = await prisma.category.upsert({
      where: { slug: "accessories" },
      update: {},
      create: {
        name: "Accessories",
        slug: "accessories",
        description: "Fashion accessories and jewelry",
        displayOrder: 4,
        isActive: true,
      },
    });

    // Create women's subcategories
    const womensSubcategories = [
      {
        name: "Dresses",
        slug: "dresses",
        description: "Casual and formal dresses",
        displayOrder: 1,
      },
      {
        name: "Tops",
        slug: "tops",
        description: "Blouses, shirts, and t-shirts",
        displayOrder: 2,
      },
      {
        name: "Bottoms",
        slug: "bottoms",
        description: "Pants, jeans, and trousers",
        displayOrder: 3,
      },
      {
        name: "Skirts",
        slug: "skirts",
        description: "Mini, midi, and maxi skirts",
        displayOrder: 4,
      },
      {
        name: "Outerwear",
        slug: "outerwear",
        description: "Coats, jackets, and blazers",
        displayOrder: 5,
      },
      {
        name: "Activewear",
        slug: "activewear",
        description: "Sports and workout clothing",
        displayOrder: 6,
      },
      {
        name: "Underwear",
        slug: "underwear",
        description: "Lingerie and undergarments",
        displayOrder: 7,
      },
      {
        name: "Fashion Accessories",
        slug: "fashion-accessories",
        description: "Women's fashion accessories",
        displayOrder: 8,
      },
    ];

    for (const subcat of womensSubcategories) {
      await prisma.category.upsert({
        where: { slug: `womens-${subcat.slug}` },
        update: {},
        create: {
          ...subcat,
          slug: `womens-${subcat.slug}`,
          parentId: womensCategory.id,
        },
      });
    }

    // Create men's subcategories
    const mensSubcategories = [
      {
        name: "Shirts",
        slug: "shirts",
        description: "Dress shirts and casual shirts",
        displayOrder: 1,
      },
      {
        name: "Pants",
        slug: "pants",
        description: "Dress pants, jeans, and chinos",
        displayOrder: 2,
      },
      {
        name: "Suits",
        slug: "suits",
        description: "Business and formal suits",
        displayOrder: 3,
      },
      {
        name: "Outerwear",
        slug: "outerwear",
        description: "Coats, jackets, and blazers",
        displayOrder: 4,
      },
      {
        name: "Activewear",
        slug: "activewear",
        description: "Sports and workout clothing",
        displayOrder: 5,
      },
      {
        name: "Underwear",
        slug: "underwear",
        description: "Underwear and undergarments",
        displayOrder: 6,
      },
      {
        name: "Accessories",
        slug: "accessories",
        description: "Men's fashion accessories",
        displayOrder: 7,
      },
      {
        name: "Grooming",
        slug: "grooming",
        description: "Grooming and personal care",
        displayOrder: 8,
      },
    ];

    for (const subcat of mensSubcategories) {
      await prisma.category.upsert({
        where: { slug: `mens-${subcat.slug}` },
        update: {},
        create: {
          ...subcat,
          slug: `mens-${subcat.slug}`,
          parentId: mensCategory.id,
        },
      });
    }

    // Create shoes subcategories
    const shoesSubcategories = [
      {
        name: "Sneakers",
        slug: "sneakers",
        description: "Casual and athletic sneakers",
        displayOrder: 1,
      },
      {
        name: "Dress Shoes",
        slug: "dress-shoes",
        description: "Formal and business shoes",
        displayOrder: 2,
      },
      {
        name: "Boots",
        slug: "boots",
        description: "Ankle boots, knee-high boots",
        displayOrder: 3,
      },
      {
        name: "Sandals",
        slug: "sandals",
        description: "Summer sandals and flip-flops",
        displayOrder: 4,
      },
      {
        name: "Heels",
        slug: "heels",
        description: "High heels and pumps",
        displayOrder: 5,
      },
      {
        name: "Flats",
        slug: "flats",
        description: "Ballet flats and loafers",
        displayOrder: 6,
      },
      {
        name: "Athletic",
        slug: "athletic",
        description: "Running and training shoes",
        displayOrder: 7,
      },
      {
        name: "Loafers",
        slug: "loafers",
        description: "Casual and dress loafers",
        displayOrder: 8,
      },
    ];

    for (const subcat of shoesSubcategories) {
      await prisma.category.upsert({
        where: { slug: `shoes-${subcat.slug}` },
        update: {},
        create: {
          ...subcat,
          slug: `shoes-${subcat.slug}`,
          parentId: shoesCategory.id,
        },
      });
    }

    // Create accessories subcategories
    const accessoriesSubcategories = [
      {
        name: "Bags",
        slug: "bags",
        description: "Handbags, backpacks, and travel bags",
        displayOrder: 1,
      },
      {
        name: "Jewelry",
        slug: "jewelry",
        description: "Necklaces, earrings, rings, and bracelets",
        displayOrder: 2,
      },
      {
        name: "Watches",
        slug: "watches",
        description: "Luxury and casual timepieces",
        displayOrder: 3,
      },
      {
        name: "Hats",
        slug: "hats",
        description: "Caps, beanies, and fashion hats",
        displayOrder: 4,
      },
      {
        name: "Belts",
        slug: "belts",
        description: "Leather belts and fashion belts",
        displayOrder: 5,
      },
      {
        name: "Sunglasses",
        slug: "sunglasses",
        description: "Designer and sports sunglasses",
        displayOrder: 6,
      },
      {
        name: "Scarves",
        slug: "scarves",
        description: "Silk scarves and winter scarves",
        displayOrder: 7,
      },
      {
        name: "Wallets",
        slug: "wallets",
        description: "Leather wallets and card holders",
        displayOrder: 8,
      },
    ];

    for (const subcat of accessoriesSubcategories) {
      await prisma.category.upsert({
        where: { slug: `accessories-${subcat.slug}` },
        update: {},
        create: {
          ...subcat,
          slug: `accessories-${subcat.slug}`,
          parentId: accessoriesCategory.id,
        },
      });
    }

    console.log("✅ Subcategories seed completed successfully!");

    // Display summary
    const totalCategories = await prisma.category.count();
    const mainCategories = await prisma.category.count({
      where: { parentId: null },
    });
    const subcategories = await prisma.category.count({
      where: { parentId: { not: null } },
    });

    console.log(`📊 Summary:`);
    console.log(`   Total categories: ${totalCategories}`);
    console.log(`   Main categories: ${mainCategories}`);
    console.log(`   Subcategories: ${subcategories}`);
  } catch (error) {
      console.error("Error:", error);
    console.error("❌ Error seeding subcategories:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedSubcategories().catch((error) => {
  console.error(error);
  process.exit(1);
});
