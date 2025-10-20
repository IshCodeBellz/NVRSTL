import { prisma } from "../lib/server/prisma";
import { hash } from "bcryptjs";

/**
 * Demo Data Seeder for NVRSTL
 * Creates sample data to showcase all functionality:
 * - Admin accounts
 * - User accounts with orders
 * - Trending products
 * - Recently viewed products
 * - Cart items
 * - Wishlist items
 * - Product reviews
 * - Order history
 */

async function main() {
  console.log("🚀 Starting demo data seed...");

  // Create admin account
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@dyofficial.com" },
    update: {
      isAdmin: true,
      emailVerified: true,
    },
    create: {
      email: "admin@dyofficial.com",
      name: "Admin User",
      passwordHash: adminPassword,
      isAdmin: true,
      emailVerified: true,
    },
  });

  // Create test user accounts
  const testUserPassword = await hash("user123", 12);
  const testUser1 = await prisma.user.upsert({
    where: { email: "john@example.com" },
    update: {},
    create: {
      email: "john@example.com",
      name: "John Doe",
      passwordHash: testUserPassword,
      emailVerified: true,
    },
  });

  const testUser2 = await prisma.user.upsert({
    where: { email: "jane@example.com" },
    update: {},
    create: {
      email: "jane@example.com",
      name: "Jane Smith",
      passwordHash: testUserPassword,
      emailVerified: true,
    },
  });

  console.log("✅ Created admin and test users");

  // Get some products for demo data
  const products = await prisma.product.findMany({
    take: 10,
    include: { sizeVariants: true, images: true },
  });

  if (products.length === 0) {
    console.log(
      "❌ No products found. Please run the comprehensive seed first."
    );
    return;
  }

  // Create sample orders for order history
  console.log("📦 Creating sample orders...");

  // Create addresses first
  const address1 = await prisma.address.create({
    data: {
      userId: testUser1.id,
      fullName: "John Doe",
      line1: "123 Main St",
      line2: "Apt 4B",
      city: "New York",
      region: "NY",
      postalCode: "10001",
      country: "US",
      phone: "+1-555-0123",
    },
  });

  const address2 = await prisma.address.create({
    data: {
      userId: testUser2.id,
      fullName: "Jane Smith",
      line1: "456 Oak Ave",
      city: "Los Angeles",
      region: "CA",
      postalCode: "90210",
      country: "US",
      phone: "+1-555-0456",
    },
  });

  const order1 = await prisma.order.create({
    data: {
      userId: testUser1.id,
      status: "DELIVERED",
      subtotalCents: 14999,
      shippingCents: 499,
      totalCents: 15498,
      email: testUser1.email,
      shippingAddressId: address1.id,
      billingAddressId: address1.id,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
  });

  // Add order items to the order
  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order1.id,
        productId: products[0].id,
        sku: products[0].sku,
        nameSnapshot: products[0].name,
        qty: 1,
        size: products[0].sizeVariants[0]?.label || null,
        unitPriceCents: products[0].priceCents,
        priceCentsSnapshot: products[0].priceCents,
        lineTotalCents: products[0].priceCents,
      },
      {
        orderId: order1.id,
        productId: products[1].id,
        sku: products[1].sku,
        nameSnapshot: products[1].name,
        qty: 2,
        size: products[1].sizeVariants[0]?.label || null,
        unitPriceCents: products[1].priceCents,
        priceCentsSnapshot: products[1].priceCents,
        lineTotalCents: products[1].priceCents * 2,
      },
    ],
  });

  const order2 = await prisma.order.create({
    data: {
      userId: testUser2.id,
      status: "PROCESSING",
      subtotalCents: 8999,
      totalCents: 8999,
      email: testUser2.email,
      shippingAddressId: address2.id,
      billingAddressId: address2.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      productId: products[2].id,
      sku: products[2].sku,
      nameSnapshot: products[2].name,
      qty: 1,
      size: products[2].sizeVariants[0]?.label || null,
      unitPriceCents: products[2].priceCents,
      priceCentsSnapshot: products[2].priceCents,
      lineTotalCents: products[2].priceCents,
    },
  });

  console.log("✅ Created sample orders");

  // Create cart items for test users
  console.log("🛒 Creating sample cart items...");

  const cart1 = await prisma.cart.upsert({
    where: { userId: testUser1.id },
    update: {},
    create: { userId: testUser1.id },
  });

  await prisma.cartLine.createMany({
    data: [
      {
        cartId: cart1.id,
        productId: products[3].id,
        qty: 1,
        size: products[3].sizeVariants[0]?.label || null,
        priceCentsSnapshot: products[3].priceCents,
      },
      {
        cartId: cart1.id,
        productId: products[4].id,
        qty: 2,
        size: products[4].sizeVariants[0]?.label || null,
        priceCentsSnapshot: products[4].priceCents,
      },
    ],
  });

  const cart2 = await prisma.cart.upsert({
    where: { userId: testUser2.id },
    update: {},
    create: { userId: testUser2.id },
  });

  await prisma.cartLine.create({
    data: {
      cartId: cart2.id,
      productId: products[5].id,
      qty: 1,
      size: products[5].sizeVariants[0]?.label || null,
      priceCentsSnapshot: products[5].priceCents,
    },
  });

  console.log("✅ Created sample cart items");

  // Create wishlist items
  console.log("❤️ Creating sample wishlist items...");

  // Create wishlists first
  const wishlist1 = await prisma.wishlist.upsert({
    where: { userId: testUser1.id },
    update: {},
    create: { userId: testUser1.id, name: "John's Wishlist" },
  });

  const wishlist2 = await prisma.wishlist.upsert({
    where: { userId: testUser2.id },
    update: {},
    create: { userId: testUser2.id, name: "Jane's Wishlist" },
  });

  await prisma.wishlistItem.createMany({
    data: [
      {
        wishlistId: wishlist1.id,
        productId: products[6].id,
      },
      {
        wishlistId: wishlist1.id,
        productId: products[7].id,
      },
      {
        wishlistId: wishlist2.id,
        productId: products[8].id,
      },
      {
        wishlistId: wishlist2.id,
        productId: products[9].id,
      },
    ],
  });

  console.log("✅ Created sample wishlist items");

  // Create some discount codes for testing
  console.log("🎫 Creating sample discount codes...");

  await prisma.discountCode.createMany({
    data: [
      {
        code: "WELCOME10",
        kind: "percentage",
        percent: 10,
        minSubtotalCents: 5000, // $50 minimum
        usageLimit: 100,
        timesUsed: 5,
        startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started yesterday
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
      },
      {
        code: "SAVE20",
        kind: "fixed",
        valueCents: 2000, // $20 off
        minSubtotalCents: 10000, // $100 minimum
        usageLimit: 50,
        timesUsed: 12,
        startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Started a week ago
        endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Expires in 2 weeks
      },
    ],
  });

  console.log("✅ Created sample discount codes");

  // Summary
  console.log("\n🎉 Demo data seed completed successfully!");
  console.log("\n📋 **ADMIN ACCOUNT DETAILS:**");
  console.log("Email: admin@dyofficial.com");
  console.log("Password: admin123");
  console.log("Access: http://localhost:3000/admin");

  console.log("\n👥 **TEST USER ACCOUNTS:**");
  console.log("User 1 - Email: john@example.com, Password: user123");
  console.log("User 2 - Email: jane@example.com, Password: user123");

  console.log("\n🧪 **FEATURES TO TEST:**");
  console.log("• Trending Now - Visit homepage to see trending products");
  console.log("• Recently Viewed - Browse products, then check homepage");
  console.log("• Shopping Cart - Login as test user to see pre-filled cart");
  console.log("• Wishlist - Login to see saved items");
  console.log("• Order History - Login and visit /account to see past orders");
  console.log("• Product Reviews - Check individual product pages");
  console.log("• Discount Codes - Use WELCOME10 or SAVE20 at checkout");
  console.log("• Admin Panel - Login as admin to manage products/orders");

  console.log("\n🔗 **USEFUL URLS:**");
  console.log("• Homepage: http://localhost:3000");
  console.log("• Login: http://localhost:3000/login");
  console.log("• Admin Panel: http://localhost:3000/admin");
  console.log("• Account: http://localhost:3000/account");
  console.log("• Cart: http://localhost:3000/bag");
  console.log("• Wishlist: http://localhost:3000/saved");
}

main()
  .catch((e) => {
    console.error("❌ Error in demo seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
