#!/usr/bin/env ts-node

// Force loading .env.local first
import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });

// Override with local database URL to match API
process.env.DATABASE_URL = "postgresql://ishaqbello@localhost:5432/test_db";

import { prisma } from "./lib/server/prisma";
import { hashPassword } from "./lib/server/auth";

async function createTestUser() {
  console.log("Creating test user for security testing...");

  const testEmail = "security-test@example.com";
  const testPassword = "TestPassword123";

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (existingUser) {
    console.log("Test user already exists:", testEmail);
    return existingUser;
  }

  // Create new test user
  const passwordHash = await hashPassword(testPassword);

  const user = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash,
      name: "Security Test User",
      emailVerified: true,
      failedLoginAttempts: 0,
      lastLoginAt: null,
      lockedAt: null,
      lastPasswordChangeAt: null,
    },
  });

  console.log("✅ Test user created successfully!");
  console.log(`Email: ${testEmail}`);
  console.log(`Password: ${testPassword}`);
  console.log(`User ID: ${user.id}`);

  return user;
}

async function checkUserSecurityFields() {
  console.log("\n=== Current User Security Status ===");

  const users = await prisma.user.findMany({
    select: {
      email: true,
      lastLoginAt: true,
      failedLoginAttempts: true,
      lockedAt: true,
      lastPasswordChangeAt: true,
    },
    orderBy: { email: "asc" },
  });

  users.forEach((user) => {
    console.log(`\nUser: ${user.email}`);
    console.log(`  Last Login: ${user.lastLoginAt?.toISOString() || "Never"}`);
    console.log(`  Failed Attempts: ${user.failedLoginAttempts}`);
    console.log(`  Locked At: ${user.lockedAt?.toISOString() || "Not locked"}`);
    console.log(
      `  Password Changed: ${
        user.lastPasswordChangeAt?.toISOString() || "Never"
      }`
    );
  });
}

async function main() {
  try {
    await createTestUser();
    await checkUserSecurityFields();
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
