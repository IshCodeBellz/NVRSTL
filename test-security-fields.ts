#!/usr/bin/env ts-node

// Force loading .env.local first
import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });

// Override with local database URL to match API
process.env.DATABASE_URL = "postgresql://ishaqbello@localhost:5432/test_db";

import { prisma } from "./lib/server/prisma";

async function testSecurityFields() {
  console.log("=== Testing Security Fields ===\n");

  // Check current state of security fields for all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      lastLoginAt: true,
      lastPasswordChangeAt: true,
      failedLoginAttempts: true,
      lockedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  console.log(`Found ${users.length} users:\n`);

  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email}:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created: ${user.createdAt.toLocaleString()}`);
    console.log(
      `   Last Login: ${user.lastLoginAt?.toLocaleString() || "Never"}`
    );
    console.log(
      `   Last Password Change: ${
        user.lastPasswordChangeAt?.toLocaleString() || "Never"
      }`
    );
    console.log(`   Failed Attempts: ${user.failedLoginAttempts}`);
    console.log(
      `   Locked At: ${user.lockedAt?.toLocaleString() || "Not locked"}`
    );
    console.log("");
  });

  // Test updating a user's security fields
  if (users.length > 0) {
    const testUser = users[0];
    console.log(`Testing security field updates for: ${testUser.email}`);

    // Simulate a failed login attempt
    console.log("\n1. Simulating failed login attempt...");
    const updatedUser = await prisma.user.update({
      where: { id: testUser.id },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
      select: {
        email: true,
        failedLoginAttempts: true,
        lockedAt: true,
      },
    });

    console.log(`   Failed attempts now: ${updatedUser.failedLoginAttempts}`);

    // Test locking after 5 attempts
    if (updatedUser.failedLoginAttempts < 5) {
      console.log(
        "\n2. Simulating multiple failed attempts to trigger lock..."
      );
      const lockedUser = await prisma.user.update({
        where: { id: testUser.id },
        data: {
          failedLoginAttempts: 5,
          lockedAt: new Date(),
        },
        select: {
          email: true,
          failedLoginAttempts: true,
          lockedAt: true,
        },
      });

      console.log(
        `   Account locked at: ${lockedUser.lockedAt?.toLocaleString()}`
      );
    }

    // Test successful login (reset attempts, update lastLoginAt)
    console.log("\n3. Simulating successful login...");
    const resetUser = await prisma.user.update({
      where: { id: testUser.id },
      data: {
        failedLoginAttempts: 0,
        lockedAt: null,
        lastLoginAt: new Date(),
      },
      select: {
        email: true,
        failedLoginAttempts: true,
        lockedAt: true,
        lastLoginAt: true,
      },
    });

    console.log(
      `   Failed attempts reset to: ${resetUser.failedLoginAttempts}`
    );
    console.log(
      `   Locked status: ${resetUser.lockedAt ? "Still locked" : "Unlocked"}`
    );
    console.log(
      `   Last login updated to: ${resetUser.lastLoginAt?.toLocaleString()}`
    );
  }
}

testSecurityFields()
  .catch(console.error)
  .finally(() => process.exit(0));
