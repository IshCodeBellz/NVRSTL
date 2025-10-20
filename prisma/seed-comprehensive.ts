import { prisma } from "../lib/server/prisma";
import { hash } from "bcryptjs";

/**
 * Comprehensive Sample Data Seeder for NVRSTL
 * Populates database with realistic e-commerce data
 */

const categories = [
  { name: "Women's Clothing", slug: "womens-clothing" },
  { name: "Men's Clothing", slug: "mens-clothing" },
  { name: "Footwear", slug: "footwear" },
  { name: "Accessories", slug: "accessories" },
  { name: "Sportswear", slug: "sportswear" },
  { name: "Denim", slug: "denim" },
  { name: "Outerwear", slug: "outerwear" },
  { name: "Dresses", slug: "dresses" },
];

const brands = [
  { name: "ASOS Design" },
  { name: "Nike" },
  { name: "Adidas" },
  { name: "Zara" },
  { name: "H&M" },
  { name: "Calvin Klein" },
  { name: "Tommy Hilfiger" },
  { name: "Levi's" },
  { name: "Puma" },
  { name: "Urban Outfitters" },
];

const products = [
  // Women's Clothing
  {
    name: "Oversized Blazer",
    description:
      "A relaxed fit blazer perfect for both office and casual wear. Made from sustainable materials.",
    priceCents: 5499,
    comparePriceCents: 6999,
    categorySlug: "womens-clothing",
    brandSlug: "asos-design",
    isFeatured: true,
    images: [
      {
        url: "/images/products/blazer-1.jpg",
        alt: "Oversized Blazer Front",
        position: 1,
      },
      {
        url: "/images/products/blazer-2.jpg",
        alt: "Oversized Blazer Back",
        position: 2,
      },
    ],
    variants: [
      { type: "size", value: "XS" },
      { type: "size", value: "S" },
      { type: "size", value: "M" },
      { type: "size", value: "L" },
      { type: "color", value: "Black" },
      { type: "color", value: "Navy" },
      { type: "color", value: "Camel" },
    ],
  },
  {
    name: "Floral Summer Dress",
    description:
      "Light and airy summer dress with beautiful floral print. Perfect for warm weather.",
    priceCents: 3499,
    categorySlug: "dresses",
    brandSlug: "hm",
    isFeatured: true,
    images: [
      {
        url: "/images/products/dress-1.jpg",
        alt: "Floral Summer Dress",
        position: 1,
      },
    ],
    variants: [
      { type: "size", value: "XS" },
      { type: "size", value: "S" },
      { type: "size", value: "M" },
      { type: "size", value: "L" },
    ],
  },
  // Men's Clothing
  {
    name: "Classic White T-Shirt",
    description:
      "Essential basic white t-shirt made from 100% organic cotton. Comfortable fit for everyday wear.",
    priceCents: 1299,
    categorySlug: "mens-clothing",
    brandSlug: "asos-design",
    isFeatured: true,
    images: [
      {
        url: "/images/products/tshirt-white.jpg",
        alt: "Classic White T-Shirt",
        position: 1,
      },
    ],
    variants: [
      { type: "size", value: "S" },
      { type: "size", value: "M" },
      { type: "size", value: "L" },
      { type: "size", value: "XL" },
    ],
  },
  {
    name: "Slim Fit Jeans",
    description:
      "Modern slim fit jeans with stretch fabric for comfort and style.",
    priceCents: 4999,
    categorySlug: "denim",
    brandSlug: "levis",
    images: [
      {
        url: "/images/products/jeans-1.jpg",
        alt: "Slim Fit Jeans",
        position: 1,
      },
    ],
    variants: [
      { type: "size", value: "28" },
      { type: "size", value: "30" },
      { type: "size", value: "32" },
      { type: "size", value: "34" },
      { type: "size", value: "36" },
      { type: "color", value: "Dark Blue" },
      { type: "color", value: "Light Blue" },
      { type: "color", value: "Black" },
    ],
  },
  // Footwear
  {
    name: "Air Max Sneakers",
    description:
      "Iconic Air Max sneakers with superior comfort and style. Perfect for running or casual wear.",
    priceCents: 12999,
    categorySlug: "footwear",
    brandSlug: "nike",
    isFeatured: true,
    images: [
      {
        url: "/images/products/sneakers-1.jpg",
        alt: "Air Max Sneakers",
        position: 1,
      },
    ],
    variants: [
      { type: "size", value: "7" },
      { type: "size", value: "8" },
      { type: "size", value: "9" },
      { type: "size", value: "10" },
      { type: "size", value: "11" },
      { type: "color", value: "White" },
      { type: "color", value: "Black" },
      { type: "color", value: "Red" },
    ],
  },
  {
    name: "Chelsea Boots",
    description:
      "Classic leather Chelsea boots suitable for both casual and formal occasions.",
    priceCents: 8999,
    categorySlug: "footwear",
    brandSlug: "asos-design",
    images: [
      {
        url: "/images/products/boots-1.jpg",
        alt: "Chelsea Boots",
        position: 1,
      },
    ],
    variants: [
      { type: "size", value: "7" },
      { type: "size", value: "8" },
      { type: "size", value: "9" },
      { type: "size", value: "10" },
      { type: "color", value: "Black" },
      { type: "color", value: "Brown" },
    ],
  },
  // Sportswear
  {
    name: "Running Shorts",
    description: "Lightweight running shorts with moisture-wicking technology.",
    priceCents: 2499,
    categorySlug: "sportswear",
    brandSlug: "adidas",
    images: [
      {
        url: "/images/products/shorts-1.jpg",
        alt: "Running Shorts",
        position: 1,
      },
    ],
    variants: [
      { type: "size", value: "S" },
      { type: "size", value: "M" },
      { type: "size", value: "L" },
      { type: "size", value: "XL" },
      { type: "color", value: "Black" },
      { type: "color", value: "Navy" },
      { type: "color", value: "Grey" },
    ],
  },
  {
    name: "Yoga Leggings",
    description: "High-waisted yoga leggings with four-way stretch fabric.",
    priceCents: 3999,
    categorySlug: "sportswear",
    brandSlug: "nike",
    images: [
      {
        url: "/images/products/leggings-1.jpg",
        alt: "Yoga Leggings",
        position: 1,
      },
    ],
    variants: [
      { type: "size", value: "XS" },
      { type: "size", value: "S" },
      { type: "size", value: "M" },
      { type: "size", value: "L" },
      { type: "color", value: "Black" },
      { type: "color", value: "Grey" },
      { type: "color", value: "Navy" },
    ],
  },
  // Accessories
  {
    name: "Leather Handbag",
    description:
      "Elegant leather handbag perfect for everyday use or special occasions.",
    priceCents: 7999,
    categorySlug: "accessories",
    brandSlug: "calvin-klein",
    images: [
      {
        url: "/images/products/handbag-1.jpg",
        alt: "Leather Handbag",
        position: 1,
      },
    ],
    variants: [
      { type: "color", value: "Black" },
      { type: "color", value: "Brown" },
      { type: "color", value: "Tan" },
    ],
  },
  {
    name: "Aviator Sunglasses",
    description: "Classic aviator sunglasses with UV protection.",
    priceCents: 1599,
    categorySlug: "accessories",
    brandSlug: "asos-design",
    images: [
      {
        url: "/images/products/sunglasses-1.jpg",
        alt: "Aviator Sunglasses",
        position: 1,
      },
    ],
    variants: [
      { type: "color", value: "Gold" },
      { type: "color", value: "Silver" },
      { type: "color", value: "Black" },
    ],
  },
];

const users = [
  {
    email: "admin@asos.com",
    name: "Admin User",
    password: "admin123",
    isAdmin: true,
  },
  {
    email: "john@example.com",
    name: "John Doe",
    password: "password123",
    isAdmin: false,
  },
  {
    email: "jane@example.com",
    name: "Jane Smith",
    password: "password123",
    isAdmin: false,
  },
  {
    email: "customer@example.com",
    name: "Customer User",
    password: "password123",
    isAdmin: false,
  },
];

async function createUsers() {
  console.log("Creating users...");

  for (const userData of users) {
    const hashedPassword = await hash(userData.password, 12);

    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        name: userData.name,
        passwordHash: hashedPassword,
        isAdmin: userData.isAdmin,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
  }

  console.log(`✅ Created ${users.length} users`);
}

async function createCategories() {
  console.log("Creating categories...");

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        name: category.name,
        slug: category.slug,
      },
    });
  }

  console.log(`✅ Created ${categories.length} categories`);
}

async function createBrands() {
  console.log("Creating brands...");

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { name: brand.name },
      update: {},
      create: {
        name: brand.name,
      },
    });
  }

  console.log(`✅ Created ${brands.length} brands`);
}

async function createProducts() {
  console.log("Creating products...");

  // Get created records and build maps
  const dbCategories = await prisma.category.findMany();
  const dbBrands = await prisma.brand.findMany();

  const categoryMap = new Map<string, string>();
  const brandMap = new Map<string, string>();

  // Brand slug to name mapping
  const brandSlugToName: Record<string, string> = {
    "asos-design": "ASOS Design",
    nike: "Nike",
    adidas: "Adidas",
    zara: "Zara",
    hm: "H&M",
    "calvin-klein": "Calvin Klein",
    "tommy-hilfiger": "Tommy Hilfiger",
    levis: "Levi's",
    puma: "Puma",
    "urban-outfitters": "Urban Outfitters",
  };

  dbCategories.forEach((category) =>
    categoryMap.set(category.slug, category.id)
  );
  dbBrands.forEach((brand) => brandMap.set(brand.name, brand.id));

  for (const productData of products) {
    const categoryId = categoryMap.get(productData.categorySlug);
    const brandName = brandSlugToName[productData.brandSlug];
    const brandId = brandName ? brandMap.get(brandName) : undefined;

    if (!categoryId || !brandId) {
      console.warn(
        `Skipping product ${productData.name} - missing category or brand`
      );
      continue;
    }

    // Generate SKU
    const sku = `${productData.brandSlug
      .replace(/-/g, "")
      .toUpperCase()}-${productData.name
      .replace(/\s+/g, "")
      .substring(0, 6)
      .toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 5)
      .toUpperCase()}`;

    const product = await prisma.product.create({
      data: {
        sku,
        name: productData.name,
        description: productData.description,
        priceCents: productData.priceCents,
        comparePriceCents: productData.comparePriceCents,
        categoryId,
        brandId,
        isFeatured: productData.isFeatured || false,
        isActive: true,
        tags: JSON.stringify(productData.name.toLowerCase().split(" ")),
        images: {
          create: productData.images,
        },
      },
    });

    // Create product variants
    if (productData.variants) {
      for (const variant of productData.variants) {
        const variantSku = `${sku}-${variant.value
          .replace(/\s+/g, "")
          .toUpperCase()}`;
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: variantSku,
            name: `${productData.name} - ${variant.value}`,
            type: variant.type,
            value: variant.value,
            stock: Math.floor(Math.random() * 50) + 10, // Random stock between 10-60
            isActive: true,
          },
        });
      }
    }

    // Create product metrics
    await prisma.productMetrics.create({
      data: {
        productId: product.id,
        views: Math.floor(Math.random() * 1000) + 100,
        detailViews: Math.floor(Math.random() * 500) + 50,
        wishlists: Math.floor(Math.random() * 100) + 10,
        addToCart: Math.floor(Math.random() * 200) + 20,
        purchases: Math.floor(Math.random() * 50) + 5,
      },
    });
  }

  console.log(
    `✅ Created ${products.length} products with variants and metrics`
  );
}

async function createSampleOrders() {
  console.log("Creating sample orders...");

  const customers = await prisma.user.findMany({
    where: { isAdmin: false },
  });

  const dbProducts = await prisma.product.findMany({
    take: 5,
    include: { variants: true },
  });

  for (let i = 0; i < 10; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const product = dbProducts[Math.floor(Math.random() * dbProducts.length)];
    const variant = product.variants[0];

    const quantity = Math.floor(Math.random() * 3) + 1;
    const itemTotal = product.priceCents * quantity;
    const shippingCents = 599; // $5.99 shipping
    const totalCents = itemTotal + shippingCents;

    const statuses = ["PENDING", "PAID", "FULFILLING", "SHIPPED", "DELIVERED"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const order = await prisma.order.create({
      data: {
        userId: customer.id,
        email: customer.email,
        status,
        currency: "USD",
        subtotalCents: itemTotal,
        totalCents,
        shippingCents,
        taxCents: Math.floor(totalCents * 0.08), // 8% tax
        paidAt:
          status !== "PENDING"
            ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
            : null,
        items: {
          create: {
            productId: product.id,
            sku: variant.sku,
            nameSnapshot: product.name,
            size: variant.value,
            qty: quantity,
            unitPriceCents: product.priceCents,
            priceCentsSnapshot: product.priceCents,
            lineTotalCents: product.priceCents * quantity,
          },
        },
      },
    });

    // Create order events
    const events = [
      { kind: "ORDER_CREATED", description: "Order was created" },
    ];

    if (status !== "PENDING") {
      events.push({
        kind: "PAYMENT_SUCCEEDED",
        description: "Payment was processed successfully",
      });
    }

    if (["FULFILLING", "SHIPPED", "DELIVERED"].includes(status)) {
      events.push({
        kind: "ORDER_FULFILLING",
        description: "Order is being prepared",
      });
    }

    if (["SHIPPED", "DELIVERED"].includes(status)) {
      events.push({
        kind: "ORDER_SHIPPED",
        description: "Order has been shipped",
      });
    }

    if (status === "DELIVERED") {
      events.push({
        kind: "ORDER_DELIVERED",
        description: "Order has been delivered",
      });
    }

    for (const event of events) {
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          kind: event.kind,
          message: event.description,
          createdAt: new Date(
            Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000
          ),
        },
      });
    }
  }

  console.log("✅ Created 10 sample orders with items and events");
}

async function createUserBehavior() {
  console.log("Creating user behavior data...");

  const users = await prisma.user.findMany({ where: { isAdmin: false } });
  const products = await prisma.product.findMany({ take: 20 });

  const eventTypes = ["view", "wishlist", "cart", "purchase", "search"];

  for (let i = 0; i < 100; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    await prisma.userBehavior.create({
      data: {
        userId: user.id,
        sessionId: `session_${Math.random().toString(36).substring(2, 10)}`,
        eventType,
        productId: eventType !== "search" ? product.id : null,
        searchQuery:
          eventType === "search"
            ? ["shirt", "jeans", "dress", "shoes", "jacket"][
                Math.floor(Math.random() * 5)
              ]
            : null,
        metadata: JSON.stringify({
          userAgent: "Mozilla/5.0 (Sample)",
          timestamp: new Date(),
        }),
        timestamp: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ), // Last 30 days
      },
    });
  }

  console.log("✅ Created 100 user behavior records");
}

async function createWishlists() {
  console.log("Creating sample wishlists...");

  const users = await prisma.user.findMany({ where: { isAdmin: false } });
  const products = await prisma.product.findMany({ take: 10 });

  for (const user of users) {
    // Create default wishlist
    const wishlist = await prisma.wishlist.create({
      data: {
        userId: user.id,
        name: "My Wishlist",
        description: "Items I want to buy",
        isPublic: Math.random() > 0.5,
        shareToken:
          Math.random() > 0.5
            ? `share_${Math.random().toString(36).substring(2, 10)}`
            : null,
      },
    });

    // Add random products to wishlist
    const wishlistProducts = products.slice(
      0,
      Math.floor(Math.random() * 5) + 1
    );

    for (const product of wishlistProducts) {
      await prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId: product.id,
          notes: Math.random() > 0.7 ? "Interested in this item" : null,
        },
      });
    }
  }

  const userCount = await prisma.user.count({ where: { isAdmin: false } });
  console.log(`✅ Created wishlists for ${userCount} users`);
}

async function createSampleReviews() {
  console.log("Creating sample reviews...");

  // Get some products and users to create reviews for
  const products = await prisma.product.findMany({ take: 5 });
  const users = await prisma.user.findMany({ where: { isAdmin: false } });

  if (products.length === 0 || users.length === 0) {
    console.log("⚠️ No products or users found for reviews");
    return;
  }

  const sampleReviews = [
    {
      productId: products[0].id,
      userId: users[0].id,
      authorName: users[0].name || "Customer",
      authorEmail: users[0].email,
      rating: 5,
      title: "Excellent quality!",
      content:
        "Really happy with this purchase. The quality is outstanding and it fits perfectly. Would definitely recommend to others.",
      isVerified: true,
      helpfulVotes: 12,
      totalVotes: 15,
    },
    {
      productId: products[0].id,
      userId: users[1].id,
      authorName: users[1].name || "Customer",
      authorEmail: users[1].email,
      rating: 4,
      title: "Good value for money",
      content:
        "Nice product overall. Good quality for the price point. Delivery was quick too.",
      isVerified: true,
      helpfulVotes: 8,
      totalVotes: 10,
    },
    {
      productId: products[1].id,
      userId: users[0].id,
      authorName: users[0].name || "Customer",
      authorEmail: users[0].email,
      rating: 3,
      title: "Average product",
      content:
        "It's okay, nothing special. The material feels a bit cheap but it serves its purpose.",
      isVerified: false,
      helpfulVotes: 3,
      totalVotes: 8,
      isPublished: false, // Pending moderation
    },
    {
      productId: products[1].id,
      userId: users[2].id,
      authorName: users[2].name || "Customer",
      authorEmail: users[2].email,
      rating: 5,
      title: "Love it!",
      content:
        "Absolutely perfect! Exactly what I was looking for. Great quality and style.",
      isVerified: true,
      helpfulVotes: 20,
      totalVotes: 22,
    },
    {
      productId: products[2].id,
      userId: users[1].id,
      authorName: users[1].name || "Customer",
      authorEmail: users[1].email,
      rating: 2,
      title: "Not what I expected",
      content:
        "The product looks different from the photos. Quality is disappointing for the price.",
      isVerified: true,
      helpfulVotes: 5,
      totalVotes: 12,
      isPublished: false, // Reported content
    },
  ];

  for (const review of sampleReviews) {
    await prisma.productReview.create({
      data: review,
    });
  }

  console.log(`✅ Created ${sampleReviews.length} sample reviews`);
}

export async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");

    // Clear existing data (optional)
    console.log("🧹 Cleaning existing data...");
    await prisma.orderEvent.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.wishlistItem.deleteMany();
    await prisma.wishlist.deleteMany();
    await prisma.userBehavior.deleteMany();
    await prisma.productMetrics.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.product.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    // Create data in correct order
    await createUsers();
    await createCategories();
    await createBrands();
    await createProducts();
    await createSampleOrders();
    await createUserBehavior();
    await createWishlists();
    await createSampleReviews();

    console.log("🎉 Database seeding completed successfully!");

    // Print summary
    const counts = {
      users: await prisma.user.count(),
      categories: await prisma.category.count(),
      brands: await prisma.brand.count(),
      products: await prisma.product.count(),
      orders: await prisma.order.count(),
      wishlists: await prisma.wishlist.count(),
      behaviors: await prisma.userBehavior.count(),
      reviews: await prisma.productReview.count(),
    };

    console.log("📊 Summary:");
    Object.entries(counts).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`);
    });
  } catch (error) {
    console.error("Error:", error);
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("✅ Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}
