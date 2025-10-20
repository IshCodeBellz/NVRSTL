/**
 * Test script to verify enhanced authentication is working
 */
import { prisma } from "./lib/server/prisma";

async function testEnhancedAuth() {
  console.log("🧪 Testing Enhanced Authentication...");

  // Check if we have any users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      failedLoginAttempts: true,
      lastLoginAt: true,
      lockedAt: true,
    },
    take: 5,
  });

  console.log("👥 Users in database:", users.length);

  if (users.length > 0) {
    console.log("📊 Sample users:");
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email}`);
      console.log(`     Failed attempts: ${user.failedLoginAttempts}`);
      console.log(`     Last login: ${user.lastLoginAt || "Never"}`);
      console.log(`     Locked: ${user.lockedAt ? "Yes" : "No"}`);
      console.log("");
    });
  }

  // Check if we have test users we can use
  const testUser = await prisma.user.findFirst({
    where: {
      email: {
        contains: "test",
      },
    },
  });

  if (testUser) {
    console.log("🎯 Found test user:", testUser.email);
    console.log("   Current failed attempts:", testUser.failedLoginAttempts);
  } else {
    console.log("⚠️  No test user found. Creating one...");

    // Create a test user
    const newTestUser = await prisma.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
        passwordHash:
          "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6BMi0m9b2G", // "password123"
        failedLoginAttempts: 0,
      },
    });

    console.log("✅ Created test user:", newTestUser.email);
  }
}

testEnhancedAuth()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
