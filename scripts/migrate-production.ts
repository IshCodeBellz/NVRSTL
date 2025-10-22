#!/usr/bin/env tsx

/**
 * Production Database Migration Script
 * Run this script to apply pending migrations to production database
 */

import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { config } from "dotenv";

// Load production environment
config({ path: ".env.production" });

const prisma = new PrismaClient();

async function migrateProduction() {
  try {
    console.log("🚀 Starting production database migration...");

    // Check database connection
    await prisma.$connect();
    console.log("✅ Connected to production database");

    // Run Prisma migrations
    console.log("📦 Applying pending migrations...");
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    console.log("✅ Migrations applied successfully");

    // Generate Prisma client
    console.log("🔧 Generating Prisma client...");
    execSync("npx prisma generate", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    console.log("✅ Prisma client generated");

    // Verify migration status
    console.log("🔍 Checking migration status...");
    execSync("npx prisma migrate status", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    console.log("🎉 Production database migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateProduction();
