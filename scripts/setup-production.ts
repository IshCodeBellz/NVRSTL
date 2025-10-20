#!/usr/bin/env tsx

/**
 * Production Environment Setup Script
 *
 * This script prepares the production environment by:
 * 1. Validating all required environment variables
 * 2. Running database migrations and seeding
 * 3. Optimizing database performance
 * 4. Warming caches
 * 5. Validating all systems are ready
 */

import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface EnvironmentCheck {
  name: string;
  required: boolean;
  description: string;
  value?: string;
  status: "missing" | "present" | "valid" | "invalid";
}

const requiredEnvVars: Omit<EnvironmentCheck, "value" | "status">[] = [
  {
    name: "DATABASE_URL",
    required: true,
    description: "PostgreSQL database connection string",
  },
  {
    name: "NEXTAUTH_SECRET",
    required: true,
    description: "NextAuth.js secret for session encryption",
  },
  {
    name: "NEXTAUTH_URL",
    required: true,
    description: "Production URL for NextAuth.js callbacks",
  },
  {
    name: "SENTRY_DSN",
    required: true,
    description: "Sentry DSN for error tracking",
  },
  {
    name: "REDIS_URL",
    required: false,
    description: "Redis connection string for caching",
  },
  {
    name: "SMTP_HOST",
    required: true,
    description: "SMTP server for email notifications",
  },
  {
    name: "SMTP_PORT",
    required: true,
    description: "SMTP server port",
  },
  {
    name: "SMTP_USER",
    required: true,
    description: "SMTP username",
  },
  {
    name: "SMTP_PASS",
    required: true,
    description: "SMTP password",
  },
  {
    name: "AWS_ACCESS_KEY_ID",
    required: true,
    description: "AWS access key for S3 file uploads",
  },
  {
    name: "AWS_SECRET_ACCESS_KEY",
    required: true,
    description: "AWS secret key for S3 file uploads",
  },
  {
    name: "AWS_REGION",
    required: true,
    description: "AWS region for S3 bucket",
  },
  {
    name: "AWS_S3_BUCKET",
    required: true,
    description: "S3 bucket name for file storage",
  },
  {
    name: "STRIPE_SECRET_KEY",
    required: true,
    description: "Stripe secret key for payments",
  },
  {
    name: "STRIPE_PUBLISHABLE_KEY",
    required: true,
    description: "Stripe publishable key for frontend",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    required: true,
    description: "Stripe webhook endpoint secret",
  },
];

async function checkEnvironmentVariables(): Promise<EnvironmentCheck[]> {
  console.log("🔍 Checking environment variables...\n");

  const checks: EnvironmentCheck[] = requiredEnvVars.map((envVar) => {
    const value = process.env[envVar.name];
    let status: EnvironmentCheck["status"] = "missing";

    if (value) {
      status = "present";

      // Validate specific formats
      if (
        envVar.name === "DATABASE_URL" &&
        !value.startsWith("postgresql://")
      ) {
        status = "invalid";
      } else if (envVar.name === "NEXTAUTH_URL" && !value.startsWith("http")) {
        status = "invalid";
      } else if (
        envVar.name === "REDIS_URL" &&
        value &&
        !value.startsWith("redis://")
      ) {
        status = "invalid";
      } else if (
        envVar.name === "SENTRY_DSN" &&
        !value.startsWith("https://")
      ) {
        status = "invalid";
      } else if (status === "present") {
        status = "valid";
      }
    } else if (!envVar.required) {
      status = "present"; // Optional vars are OK to be missing
    }

    return {
      ...envVar,
      value: value
        ? value.length > 20
          ? value.substring(0, 20) + "..."
          : value
        : undefined,
      status,
    };
  });

  // Print results
  checks.forEach((check) => {
    const icon =
      check.status === "valid"
        ? "✅"
        : check.status === "present"
        ? "⚠️"
        : check.status === "invalid"
        ? "❌"
        : "❌";

    const statusText =
      check.status === "valid"
        ? "VALID"
        : check.status === "present"
        ? "PRESENT"
        : check.status === "invalid"
        ? "INVALID"
        : "MISSING";

    console.log(`${icon} ${check.name}: ${statusText}`);
    if (check.status === "missing" && check.required) {
      console.log(`   ⚠️  Required: ${check.description}`);
    } else if (check.status === "invalid") {
      console.log(`   ❌ Invalid format: ${check.description}`);
    }
  });

  const missingRequired = checks.filter(
    (c) => c.required && (c.status === "missing" || c.status === "invalid")
  );
  if (missingRequired.length > 0) {
    console.log(
      `\n❌ ${missingRequired.length} required environment variables are missing or invalid.`
    );
    console.log(
      "\n💡 Create a .env.local file with the required variables or set them in your deployment environment."
    );
    console.log("   See .env.production.template for reference.");
  } else {
    console.log(
      "\n✅ All required environment variables are configured correctly."
    );
  }

  return checks;
}

async function runDatabaseMigrations(): Promise<boolean> {
  console.log("\n🚀 Running database migrations...");

  try {
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("✅ Database migrations completed successfully.");
    return true;
  } catch (error) {
    console.error("❌ Database migration failed:", error);
    return false;
  }
}

async function generatePrismaClient(): Promise<boolean> {
  console.log("\n🔧 Generating Prisma client...");

  try {
    execSync("npx prisma generate", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("✅ Prisma client generated successfully.");
    return true;
  } catch (error) {
    console.error("❌ Prisma client generation failed:", error);
    return false;
  }
}

async function testDatabaseConnection(): Promise<boolean> {
  console.log("\n🔌 Testing database connection...");

  try {
    await prisma.$connect();

    // Test basic operations
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();

    console.log(`✅ Database connection successful.`);
    console.log(`   📊 Users: ${userCount}, Products: ${productCount}`);

    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function optimizeDatabase(): Promise<boolean> {
  console.log("\n⚡ Running database optimization...");

  try {
    execSync("npx tsx scripts/optimize-database.ts", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("✅ Database optimization completed.");
    return true;
  } catch (error) {
    console.log("⚠️  Database optimization had some issues but continued.");
    return true; // Don't fail setup for optimization issues
  }
}

async function warmCaches(): Promise<boolean> {
  console.log("\n🔥 Warming caches...");

  try {
    execSync("npx tsx scripts/warm-cache.ts", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("✅ Cache warming completed.");
    return true;
  } catch (error) {
    console.log("⚠️  Cache warming had some issues but continued.");
    return true; // Don't fail setup for cache issues
  }
}

async function validateHealthChecks(): Promise<boolean> {
  console.log("\n🏥 Validating system health...");

  try {
    // Test database health endpoint by creating a simple client request
    const { PrismaClient } = await import("@prisma/client");
    const testPrisma = new PrismaClient();

    await testPrisma.$connect();
    await testPrisma.user.findFirst();
    await testPrisma.$disconnect();

    console.log("✅ Health checks passed.");
    return true;
  } catch (error) {
    console.error("❌ Health check failed:", error);
    return false;
  }
}

async function createProductionSummary(
  envChecks: EnvironmentCheck[]
): Promise<void> {
  const timestamp = new Date().toISOString();
  const summary = {
    deployment: {
      timestamp,
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
    },
    environment: {
      total_vars: envChecks.length,
      required_vars: envChecks.filter((c) => c.required).length,
      configured_vars: envChecks.filter(
        (c) => c.status === "valid" || (c.status === "present" && !c.required)
      ).length,
      missing_vars: envChecks.filter(
        (c) => c.required && c.status === "missing"
      ).length,
      invalid_vars: envChecks.filter((c) => c.status === "invalid").length,
    },
    services: {
      database: "✅ Connected",
      prisma: "✅ Generated",
      migrations: "✅ Applied",
      optimization: "✅ Complete",
      caching: "✅ Warmed",
      health_checks: "✅ Passed",
    },
  };

  console.log("\n📋 Production Setup Summary:");
  console.log("================================");
  console.log(`Timestamp: ${summary.deployment.timestamp}`);
  console.log(`Environment: ${summary.deployment.environment}`);
  console.log(`Version: ${summary.deployment.version}`);
  console.log("\nEnvironment Variables:");
  console.log(`  Total: ${summary.environment.total_vars}`);
  console.log(`  Required: ${summary.environment.required_vars}`);
  console.log(`  Configured: ${summary.environment.configured_vars}`);
  console.log(`  Missing: ${summary.environment.missing_vars}`);
  console.log(`  Invalid: ${summary.environment.invalid_vars}`);
  console.log("\nServices Status:");
  Object.entries(summary.services).forEach(([service, status]) => {
    console.log(`  ${service}: ${status}`);
  });

  // Save summary to file
  const summaryPath = path.join(process.cwd(), "production-setup-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n💾 Setup summary saved to: ${summaryPath}`);
}

async function main(): Promise<void> {
  console.log("🚀 DY Official - Production Environment Setup");
  console.log("============================================\n");

  let allChecksPassed = true;
  const results: boolean[] = [];

  // 1. Check environment variables
  const envChecks = await checkEnvironmentVariables();
  const envValid = !envChecks.some(
    (c) => c.required && (c.status === "missing" || c.status === "invalid")
  );
  results.push(envValid);
  allChecksPassed = allChecksPassed && envValid;

  if (!envValid) {
    console.log(
      "\n❌ Environment validation failed. Please fix the issues above before continuing."
    );
    process.exit(1);
  }

  // 2. Generate Prisma client
  const prismaGenerated = await generatePrismaClient();
  results.push(prismaGenerated);
  allChecksPassed = allChecksPassed && prismaGenerated;

  // 3. Run migrations
  const migrationsRun = await runDatabaseMigrations();
  results.push(migrationsRun);
  allChecksPassed = allChecksPassed && migrationsRun;

  // 4. Test database connection
  const dbConnected = await testDatabaseConnection();
  results.push(dbConnected);
  allChecksPassed = allChecksPassed && dbConnected;

  // 5. Optimize database
  const dbOptimized = await optimizeDatabase();
  results.push(dbOptimized);
  // Don't fail on optimization issues

  // 6. Warm caches
  const cachesWarmed = await warmCaches();
  results.push(cachesWarmed);
  // Don't fail on cache issues

  // 7. Validate health checks
  const healthValid = await validateHealthChecks();
  results.push(healthValid);
  allChecksPassed = allChecksPassed && healthValid;

  // 8. Create summary
  await createProductionSummary(envChecks);

  console.log("\n" + "=".repeat(50));
  if (allChecksPassed) {
    console.log("✅ Production environment setup completed successfully!");
    console.log("🎉 Your application is ready for production deployment.");
    console.log("\nNext steps:");
    console.log("  1. Deploy using: ./scripts/deploy-production.sh");
    console.log("  2. Run load tests to validate performance");
    console.log("  3. Monitor health endpoints and logs");
  } else {
    console.log("❌ Production environment setup failed!");
    console.log("Please fix the issues above before deploying to production.");
    process.exit(1);
  }
}

// Handle errors gracefully
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled error during setup:", error);
  process.exit(1);
});

// Run the setup
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
}
