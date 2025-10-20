#!/usr/bin/env ts-node

// Force loading .env.local first
import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });

// Override with local database URL to match API
process.env.DATABASE_URL = "postgresql://ishaqbello@localhost:5432/test_db";
console.log(
  "Token creation DATABASE_URL:",
  process.env.DATABASE_URL?.substring(0, 50) + "..."
);

import { createPasswordResetToken } from "./lib/server/passwordReset";

async function createToken() {
  console.log("Creating fresh password reset token...");

  // Use a test email - replace with an actual email from your database
  const testEmail = "ahmbello@hotmail.com"; // Change this to an actual user email

  const result = await createPasswordResetToken(testEmail);

  if (result) {
    console.log(`✅ Token created successfully!`);
    console.log(`Email: ${testEmail}`);
    console.log(`Token: ${result.token}`);
    console.log(`Expires: ${result.expiresAt}`);
    console.log(
      `\n🔗 Test URL: http://localhost:3000/reset-password/${result.token}`
    );

    const now = new Date();
    const minutesUntilExpiry = Math.floor(
      (result.expiresAt.getTime() - now.getTime()) / (1000 * 60)
    );
    console.log(`⏰ Expires in ${minutesUntilExpiry} minutes`);
  } else {
    console.log("❌ Failed to create token. User email might not exist.");
    console.log("Available users:");

    // Show available users
    const { prisma } = require("./lib/server/prisma");
    const users = await prisma.user.findMany({
      select: { email: true, id: true },
    });
    users.forEach((user: any) => {
      console.log(`  - ${user.email} (${user.id})`);
    });
  }
}

createToken().catch(console.error);
