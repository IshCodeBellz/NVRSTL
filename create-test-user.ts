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
  const email = "test@example.com";
  const password = "password123";

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`User ${email} already exists with ID: ${existingUser.id}`);
    return existingUser;
  }

  // Create new test user
  const passwordHash = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: "Test User",
      emailVerified: true,
      failedLoginAttempts: 0,
      lastLoginAt: null,
      lastPasswordChangeAt: null,
      lockedAt: null,
    },
  });

  console.log(`Created test user:`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`ID: ${newUser.id}`);

  return newUser;
}

createTestUser()
  .catch(console.error)
  .finally(() => process.exit(0));
