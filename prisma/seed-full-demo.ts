import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding comprehensive demo data...");

  // 1. Create Admin User
  console.log("👤 Creating admin user...");

  const adminPassword = await hash("admin123", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@dyofficial.com" },
    update: {},
    create: {
      email: "admin@dyofficial.com",
      name: "Admin User",
      passwordHash: adminPassword,
      isAdmin: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  // 2. Create Regular Test User
  console.log("👤 Creating test user...");

  const userPassword = await hash("user123", 12);
  const testUser = await prisma.user.upsert({
    where: { email: "user@dyofficial.com" },
    update: {},
    create: {
      email: "user@dyofficial.com",
      name: "Test User",
      passwordHash: userPassword,
      isAdmin: false,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  // 3. Get existing products (from comprehensive seed)
  const products = await prisma.product.findMany({
    take: 20,
    include: { sizeVariants: true, images: true },
  });

  if (products.length === 0) {
    console.log("❌ No products found. Please run comprehensive seed first.");
    return;
  }

  console.log(`📦 Found ${products.length} products to work with`);

  // 4. Create Product Metrics (for trending functionality)
  console.log("🔥 Creating product metrics for trending...");

  for (let i = 0; i < Math.min(products.length, 10); i++) {
    const product = products[i];
    await prisma.productMetrics.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        views: 1000 - i * 80,
        detailViews: 500 - i * 40,
        wishlists: 100 - i * 8,
        addToCart: 200 - i * 15,
        purchases: 50 - i * 4,
      },
    });
  }

  // 5. Create User Behavior for Recently Viewed
  console.log("👀 Creating user behavior data...");

  // Clear existing behavior for test user
  await prisma.userBehavior.deleteMany({ where: { userId: testUser.id } });

  const recentlyViewedProducts = products
    .slice(5, 15)
    .map((product, index) => ({
      userId: testUser.id,
      sessionId: "test-session-123",
      eventType: "PRODUCT_VIEW",
      productId: product.id,
      timestamp: new Date(Date.now() - index * 60 * 60 * 1000), // Spread over last 10 hours
      ipAddress: "127.0.0.1",
      userAgent: "Test Browser",
    }));

  await prisma.userBehavior.createMany({
    data: recentlyViewedProducts,
  });

  // 6. Create Wishlist and Items for Test User
  console.log("💖 Creating wishlist...");

  // Delete existing wishlist
  await prisma.wishlist.deleteMany({ where: { userId: testUser.id } });

  const wishlist = await prisma.wishlist.create({
    data: {
      userId: testUser.id,
      name: "My Favorites",
      description: "Products I love",
      isPublic: true,
    },
  });

  const wishlistProducts = products.slice(8, 13);
  const wishlistItems = wishlistProducts.map((product) => ({
    wishlistId: wishlist.id,
    productId: product.id,
    notes: `Love this ${product.name}!`,
  }));

  await prisma.wishlistItem.createMany({
    data: wishlistItems,
  });

  // 7. Create Cart with Items for Test User
  console.log("🛒 Creating test cart...");

  // Clear existing cart
  await prisma.cartLine.deleteMany({
    where: { cart: { userId: testUser.id } },
  });
  await prisma.cart.deleteMany({ where: { userId: testUser.id } });

  const cart = await prisma.cart.create({
    data: { userId: testUser.id },
  });

  const cartProducts = products.slice(0, 3);
  for (const product of cartProducts) {
    const sizeVariant = product.sizeVariants[0];
    if (sizeVariant) {
      await prisma.cartLine.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          size: sizeVariant.label,
          qty: Math.floor(Math.random() * 3) + 1,
          priceCentsSnapshot: product.priceCents,
        },
      });
    }
  }

  // 8. Create Sample Order
  console.log("� Creating sample order...");

  // Create shipping address
  const shippingAddress = await prisma.address.create({
    data: {
      userId: testUser.id,
      fullName: "Test User",
      line1: "123 Test Street",
      line2: "Apt 4B",
      city: "Test City",
      region: "TC",
      postalCode: "12345",
      country: "US",
      phone: "+1-555-0123",
    },
  });

  const orderProducts = products.slice(0, 2);
  const subtotalCents = orderProducts.reduce((sum, p) => sum + p.priceCents, 0);
  const shippingCents = 500;
  const taxCents = Math.round(subtotalCents * 0.08); // 8% tax
  const totalCents = subtotalCents + shippingCents + taxCents;

  const order = await prisma.order.create({
    data: {
      userId: testUser.id,
      status: "DELIVERED",
      subtotalCents,
      shippingCents,
      taxCents,
      totalCents,
      email: testUser.email!,
      shippingAddressId: shippingAddress.id,
      billingAddressId: shippingAddress.id,
      paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
  });

  // Create order items
  for (let i = 0; i < orderProducts.length; i++) {
    const product = orderProducts[i];
    const qty = i + 1;
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        sku: product.sku,
        nameSnapshot: product.name,
        size: product.sizeVariants[0]?.label || "ONE",
        qty,
        unitPriceCents: product.priceCents,
        priceCentsSnapshot: product.priceCents,
        lineTotalCents: product.priceCents * qty,
      },
    });
  }

  // 9. Create Product Reviews
  console.log("⭐ Creating product reviews...");

  const reviews = products.slice(0, 8).map((product, index) => ({
    productId: product.id,
    userId: testUser.id,
    authorName: "Test User",
    authorEmail: testUser.email!,
    rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
    title: `Excellent product!`,
    content: `I absolutely love this ${
      product.name
    }. The quality is outstanding and it exceeded my expectations. Highly recommended for anyone looking for ${product.description.toLowerCase()}.`,
    isVerified: true,
    isPublished: true,
    helpfulVotes: Math.floor(Math.random() * 10) + 1,
    totalVotes: Math.floor(Math.random() * 15) + 5,
  }));

  await prisma.productReview.createMany({
    data: reviews,
  });

  // 10. Update Review Analytics
  console.log("📊 Creating review analytics...");

  for (const product of products.slice(0, 8)) {
    const productReviews = await prisma.productReview.findMany({
      where: { productId: product.id },
    });

    if (productReviews.length > 0) {
      const avgRating =
        productReviews.reduce((sum, r) => sum + r.rating, 0) /
        productReviews.length;
      const ratingCounts = {
        1: productReviews.filter((r) => r.rating === 1).length,
        2: productReviews.filter((r) => r.rating === 2).length,
        3: productReviews.filter((r) => r.rating === 3).length,
        4: productReviews.filter((r) => r.rating === 4).length,
        5: productReviews.filter((r) => r.rating === 5).length,
      };

      await prisma.reviewAnalytics.upsert({
        where: { productId: product.id },
        update: {},
        create: {
          productId: product.id,
          totalReviews: productReviews.length,
          averageRating: avgRating,
          ratingCounts: JSON.stringify(ratingCounts),
          helpfulVotes: productReviews.reduce(
            (sum, r) => sum + r.helpfulVotes,
            0
          ),
          lastReviewAt: new Date(),
        },
      });
    }
  }

  // 11. Update Product Stock Levels for Testing
  console.log("📦 Updating stock levels...");

  // Normal stock levels
  for (const product of products.slice(0, 5)) {
    for (const sizeVariant of product.sizeVariants) {
      await prisma.sizeVariant.update({
        where: { id: sizeVariant.id },
        data: { stock: Math.floor(Math.random() * 50) + 20 }, // 20-70 stock
      });
    }
  }

  // Low stock levels for testing alerts
  for (const product of products.slice(5, 8)) {
    for (const sizeVariant of product.sizeVariants) {
      await prisma.sizeVariant.update({
        where: { id: sizeVariant.id },
        data: { stock: Math.floor(Math.random() * 3) + 1 }, // 1-3 stock (low)
      });
    }
  }

  // 12. Create Inventory Alerts
  console.log("🚨 Creating inventory alerts...");

  const lowStockProducts = products.slice(5, 8);
  for (const product of lowStockProducts) {
    await prisma.inventoryAlert.create({
      data: {
        productId: product.id,
        alertType: "LOW_STOCK",
        threshold: 5,
        currentStock: Math.floor(Math.random() * 3) + 1,
        message: `Low stock alert for ${product.name}`,
        isResolved: false,
      },
    });
  }

  // 13. Create Recommendations
  console.log("🎯 Creating product recommendations...");

  const recommendationTypes = [
    "TRENDING",
    "SIMILAR",
    "CROSS_SELL",
    "RECENTLY_VIEWED",
  ];
  for (const product of products.slice(0, 5)) {
    for (const type of recommendationTypes) {
      await prisma.recommendation.create({
        data: {
          userId: testUser.id,
          productId: product.id,
          type,
          score: Math.random() * 0.8 + 0.2, // 0.2-1.0 score
          metadata: JSON.stringify({ reason: `Generated for demo purposes` }),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });
    }
  }

  console.log("✅ Demo data seeding completed!");
  console.log("\n🔑 Admin Account:");
  console.log("Email: admin@dyofficial.com");
  console.log("Password: admin123");
  console.log("\n👤 Test User Account:");
  console.log("Email: user@dyofficial.com");
  console.log("Password: user123");
  console.log("\n🎯 Features to test:");
  console.log("- Homepage with trending products");
  console.log("- Recently viewed (login as test user and view products)");
  console.log("- Pre-loaded cart with 3 items");
  console.log("- Wishlist with 5 saved items");
  console.log("- Admin dashboard (/admin) - login as admin");
  console.log("- Product reviews and ratings");
  console.log("- Order history with delivered order");
  console.log("- Low stock alerts in admin");
  console.log("- Product recommendations");
  console.log("\n📱 Test URLs:");
  console.log("- Homepage: http://localhost:3000");
  console.log("- Admin: http://localhost:3000/admin");
  console.log("- Login: http://localhost:3000/login");
  console.log("- Cart: http://localhost:3000/bag");
  console.log("- Wishlist: http://localhost:3000/saved");
  console.log("- Orders: http://localhost:3000/account");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
