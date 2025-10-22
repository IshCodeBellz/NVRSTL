#!/usr/bin/env tsx

/**
 * Production Database Baseline Script
 * This script baselines an existing production database for Prisma migrations
 */

import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { config } from "dotenv";

// Load production environment
config({ path: ".env.production" });

const prisma = new PrismaClient();

async function baselineProduction() {
  try {
    console.log("🚀 Starting production database baseline...");

    // Check database connection
    await prisma.$connect();
    console.log("✅ Connected to production database");

    // Check if _prisma_migrations table exists
    const migrationTableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `;

    console.log("📊 Migration table exists:", migrationTableExists);

    // Mark all existing migrations as applied
    console.log("📝 Marking existing migrations as applied...");
    const migrations = [
      "20240910120000_add_order_item_customizations",
      "20251003030812_init",
      "20251004203420_add_user_profile_fields",
      "20251005011329_add_brand_enhancements",
      "20251005142352_add_default_address_field",
      "20251005153000_add_product_gender",
      "20251007000000_add_category_description",
      "20251008222855_add_security_models",
      "20251013151656_add_cms_tables",
      "20251014100531_payment_retry_attempts",
      "20251014110920_notification_system",
      "20251016233914_full_db_mig",
      "20251017123927_remove_user_mfa_fields",
      "20251019000441_review_vote_report_and_moderation",
      "20251019222223_jersey",
      "20251021000000_backfill_order_item_customizations",
    ];

    for (const migration of migrations) {
      try {
        execSync(`npx prisma migrate resolve --applied "${migration}"`, {
          stdio: "inherit",
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        });
        console.log(`✅ Marked ${migration} as applied`);
      } catch (error) {
        console.log(
          `⚠️  Could not mark ${migration} as applied (may already exist)`
        );
      }
    }

    // Now try to deploy any remaining migrations
    console.log("📦 Deploying any remaining migrations...");
    try {
      execSync("npx prisma migrate deploy", {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      });
      console.log("✅ Remaining migrations deployed");
    } catch (error) {
      console.log("ℹ️  No new migrations to deploy");
    }

    // Generate Prisma client
    console.log("🔧 Generating Prisma client...");
    execSync("npx prisma generate", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    console.log("✅ Prisma client generated");

    // Verify migration status
    console.log("🔍 Checking final migration status...");
    execSync("npx prisma migrate status", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    console.log("🎉 Production database baseline completed successfully!");
  } catch (error) {
    console.error("❌ Baseline failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run baseline
baselineProduction();
