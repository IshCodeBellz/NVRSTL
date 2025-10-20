#!/usr/bin/env ts-node

// Force loading .env.local first
import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import { NextRequest } from "next/server";

async function testLoginSecurity() {
  console.log("=== Testing Login Security System ===");

  const baseUrl = "http://localhost:3000";
  const testUser = {
    email: "security-test@example.com",
    password: "TestPassword123",
    wrongPassword: "WrongPassword123",
  };

  console.log(`\n1. Testing with correct password...`);

  // Test successful login
  try {
    const response = await fetch(`${baseUrl}/api/auth/signin/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
        csrfToken: "test-token",
      }),
    });

    console.log(`Response status: ${response.status}`);
    const result = await response.text();
    console.log(`Response: ${result.substring(0, 200)}...`);
  } catch (error) {
    console.log(`Error: ${error}`);
  }

  console.log(
    `\n2. Testing with wrong password (should increment failed attempts)...`
  );

  // Test failed login
  for (let i = 1; i <= 6; i++) {
    try {
      console.log(`\nAttempt ${i} with wrong password:`);
      const response = await fetch(`${baseUrl}/api/auth/signin/credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.wrongPassword,
          csrfToken: "test-token",
        }),
      });

      console.log(`Response status: ${response.status}`);

      // Check database state after each attempt
      const { prisma } = await import("./lib/server/prisma");
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
        select: {
          failedLoginAttempts: true,
          lockedAt: true,
          lastLoginAt: true,
        },
      });

      console.log(`Failed attempts: ${user?.failedLoginAttempts}`);
      console.log(
        `Locked at: ${user?.lockedAt?.toISOString() || "Not locked"}`
      );
      console.log(`Last login: ${user?.lastLoginAt?.toISOString() || "Never"}`);

      if (user?.lockedAt) {
        console.log("🔒 Account is now locked!");
        break;
      }
    } catch (error) {
      console.log(`Error: ${error}`);
    }
  }
}

testLoginSecurity().catch(console.error);
