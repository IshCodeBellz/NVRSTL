import { prisma } from "../lib/server/prisma";

/**
 * Generate User Behavior Data for Testing Trending and Recently Viewed
 */

async function main() {
  console.log("🔥 Generating user behavior data for trending...");

  // Get test users
  const testUser1 = await prisma.user.findUnique({
    where: { email: "john@example.com" },
  });

  const testUser2 = await prisma.user.findUnique({
    where: { email: "jane@example.com" },
  });

  if (!testUser1 || !testUser2) {
    console.log("❌ Test users not found. Please run the demo seed first.");
    return;
  }

  // Get some products
  const products = await prisma.product.findMany({
    take: 15,
    where: { deletedAt: null },
  });

  if (products.length === 0) {
    console.log(
      "❌ No products found. Please run the comprehensive seed first."
    );
    return;
  }

  // Create user behaviors for trending calculation
  const behaviors = [];

  // Generate realistic user behavior patterns
  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    // Higher view counts for first few products (make them trending)
    const baseViews = i < 5 ? 25 : 5; // First 5 products get more views
    const viewCount = Math.floor(Math.random() * baseViews) + baseViews;

    for (let j = 0; j < viewCount; j++) {
      const userId = Math.random() > 0.5 ? testUser1.id : testUser2.id;
      const sessionId = `session_${Math.random().toString(36).substr(2, 9)}`;

      behaviors.push({
        userId,
        productId: product.id,
        sessionId,
        eventType: "VIEW",
        createdAt: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ), // Within last week
      });

      // Some products also get cart additions
      if (Math.random() > 0.8) {
        behaviors.push({
          userId,
          productId: product.id,
          sessionId,
          eventType: "ADD_TO_CART",
          createdAt: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
          ),
        });
      }
    }
  }

  // Insert behaviors in batches
  const batchSize = 100;
  let totalInserted = 0;

  try {
    for (let i = 0; i < behaviors.length; i += batchSize) {
      const batch = behaviors.slice(i, i + batchSize);
      await prisma.userBehavior.createMany({ data: batch });
      totalInserted += batch.length;
    }

    console.log(`✅ Created ${totalInserted} user behavior records`);
  } catch (error) {
      console.error("Error:", error);
    console.log(
      "ℹ️ UserBehavior model structure may be different, trying alternative approach..."
    );

    // Try creating individual records if batch fails
    let individualCount = 0;
    for (const behavior of behaviors.slice(0, 20)) {
      // Just create a few for testing
      try {
        await prisma.userBehavior.create({ data: behavior });
        individualCount++;
      } catch (error) {
      console.error("Error:", error);
        console.log("Skipping behavior record due to schema mismatch");
        break;
      }
    }

    if (individualCount > 0) {
      console.log(
        `✅ Created ${individualCount} user behavior records individually`
      );
    } else {
      console.log(
        "ℹ️ Could not create behavior records - schema may not support this data"
      );
    }
  }

  // Update product metrics for trending calculation
  console.log("📊 Updating product metrics...");

  try {
    for (let i = 0; i < Math.min(products.length, 10); i++) {
      const product = products[i];
      const viewCount =
        i < 5
          ? Math.floor(Math.random() * 50) + 50
          : Math.floor(Math.random() * 20) + 10;

      await prisma.productMetrics.upsert({
        where: { productId: product.id },
        update: {
          views: viewCount,
          detailViews: Math.floor(viewCount * 0.7),
          addToCart: Math.floor(viewCount * 0.1),
          purchases: Math.floor(viewCount * 0.05),
        },
        create: {
          productId: product.id,
          views: viewCount,
          detailViews: Math.floor(viewCount * 0.7),
          addToCart: Math.floor(viewCount * 0.1),
          purchases: Math.floor(viewCount * 0.05),
        },
      });
    }

    console.log("✅ Updated product metrics for trending calculation");
  } catch (error) {
      console.error("Error:", error);
    console.log(
      "ℹ️ ProductMetrics update failed:",
      (error as any)?.message || error
    );
  }

  console.log("\n🎉 User behavior data generation completed!");
  console.log("\n🧪 **NOW YOU CAN TEST:**");
  console.log("• Visit the homepage to see trending products");
  console.log("• Browse individual products to generate recently viewed data");
  console.log(
    "• Login as john@example.com or jane@example.com to see personalized data"
  );
  console.log(
    "• Check the trending API at: http://localhost:3000/api/search/trending"
  );
}

main()
  .catch((e) => {
    console.error("❌ Error generating behavior data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
