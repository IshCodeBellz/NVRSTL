#!/usr/bin/env ts-node

// Force loading .env.local first
import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });

// Override with local database URL to match API
process.env.DATABASE_URL = "postgresql://ishaqbello@localhost:5432/test_db";
console.log(
  "Debug script DATABASE_URL:",
  process.env.DATABASE_URL?.substring(0, 50) + "..."
);

import { prismaX } from "./lib/server/prismaEx";

async function debugPasswordResetTokens() {
  console.log("=== Password Reset Token Debug ===");

  const now = new Date();
  console.log("Current time:", now.toISOString());

  const tokens = await prismaX.passwordResetToken.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log(`\nFound ${tokens.length} recent tokens:`);

  for (const token of tokens) {
    const isExpired = token.expiresAt < now;
    const isUsed = !!token.usedAt;
    const status = isUsed ? "USED" : isExpired ? "EXPIRED" : "ACTIVE";

    console.log(`
Token: ${token.token.substring(0, 8)}...
User ID: ${token.userId}
Created: ${token.createdAt.toISOString()}
Expires: ${token.expiresAt.toISOString()}
Used At: ${token.usedAt?.toISOString() || "Never"}
Status: ${status}
Minutes until expiry: ${Math.round(
      (token.expiresAt.getTime() - now.getTime()) / (1000 * 60)
    )}
    `);
  }

  const ttlMinutes = process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || "30";
  console.log(`\nToken TTL configured to: ${ttlMinutes} minutes`);
}

debugPasswordResetTokens().catch(console.error);
