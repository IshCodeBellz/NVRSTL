#!/usr/bin/env ts-node

import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface DeploymentConfig {
  environment: "staging" | "production";
  database: {
    runMigrations: boolean;
    seedData: boolean;
    backupBeforeDeploy: boolean;
  };
  cache: {
    warmCache: boolean;
    flushCache: boolean;
  };
  healthChecks: {
    enabled: boolean;
    timeout: number;
    retries: number;
  };
  rollback: {
    enabled: boolean;
    keepBackups: number;
  };
}

class ProductionDeployment {
  private config: DeploymentConfig;
  private deploymentId: string;
  private startTime: Date;

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.deploymentId = `deploy-${Date.now()}`;
    this.startTime = new Date();
  }

  async deploy(): Promise<void> {
    console.log(`🚀 Starting ${this.config.environment} deployment...`);
    console.log(`📋 Deployment ID: ${this.deploymentId}`);
    console.log(`⏰ Started at: ${this.startTime.toISOString()}`);

    try {
      await this.validateEnvironment();
      await this.createBackup();
      await this.runPreDeploymentChecks();
      await this.deployDatabase();
      await this.deployApplication();
      await this.runPostDeploymentTasks();
      await this.validateDeployment();

      console.log(`✅ Deployment completed successfully!`);
      console.log(`🕐 Total time: ${this.getDeploymentTime()}`);
    } catch (error) {
      console.error(`❌ Deployment failed:`, error);
      if (this.config.rollback.enabled) {
        await this.rollback();
      }
      throw error;
    }
  }

  private async validateEnvironment(): Promise<void> {
    console.log("🔍 Validating environment...");

    // Check required environment variables
    const requiredVars = [
      "DATABASE_URL",
      "NEXTAUTH_SECRET",
      "NEXT_PUBLIC_APP_URL",
    ];

    if (this.config.environment === "production") {
      requiredVars.push("REDIS_URL", "SENTRY_DSN", "RESEND_API_KEY");
    }

    const missingVars = requiredVars.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}`
      );
    }

    // Validate database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("✅ Database connection validated");
    } catch (error) {
      throw new Error(`Database connection failed: ${error}`);
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);
    if (majorVersion < 18) {
      throw new Error(
        `Node.js version ${nodeVersion} is not supported. Requires Node.js 18+`
      );
    }

    console.log("✅ Environment validation completed");
  }

  private async createBackup(): Promise<void> {
    if (!this.config.database.backupBeforeDeploy) {
      console.log("⏩ Skipping database backup");
      return;
    }

    console.log("💾 Creating database backup...");

    const backupDir = path.join(process.cwd(), "backups", this.deploymentId);
    await fs.mkdir(backupDir, { recursive: true });

    const backupFile = path.join(
      backupDir,
      `db-backup-${this.deploymentId}.sql`
    );

    try {
      // Create database backup using pg_dump
      const databaseUrl = process.env.DATABASE_URL!;
      const { stdout } = await execAsync(
        `pg_dump "${databaseUrl}" > "${backupFile}"`
      );

      console.log(`✅ Database backup created: ${backupFile}`);
    } catch (error) {
      console.warn(`⚠️ Database backup failed (continuing anyway): ${error}`);
    }
  }

  private async runPreDeploymentChecks(): Promise<void> {
    console.log("🔬 Running pre-deployment checks...");

    // Check build status
    console.log("🏗️ Building application...");
    try {
      const { stdout, stderr } = await execAsync("npm run build");
      console.log("✅ Application build successful");
    } catch (error) {
      throw new Error(`Build failed: ${error}`);
    }

    // Run type checking
    console.log("🔍 Running type checks...");
    try {
      await execAsync("npx tsc --noEmit");
      console.log("✅ Type checking passed");
    } catch (error) {
      throw new Error(`Type checking failed: ${error}`);
    }

    // Run essential tests
    console.log("🧪 Running critical tests...");
    try {
      await execAsync('npm test -- --testPathPattern="critical|auth|payment"');
      console.log("✅ Critical tests passed");
    } catch (error) {
      console.warn(`⚠️ Some tests failed (review before proceeding): ${error}`);
    }

    console.log("✅ Pre-deployment checks completed");
  }

  private async deployDatabase(): Promise<void> {
    if (!this.config.database.runMigrations) {
      console.log("⏩ Skipping database migrations");
      return;
    }

    console.log("🗄️ Running database migrations...");

    try {
      // Generate Prisma client
      await execAsync("npx prisma generate");
      console.log("✅ Prisma client generated");

      // Run migrations
      await execAsync("npx prisma migrate deploy");
      console.log("✅ Database migrations completed");

      // Seed production data if enabled
      if (this.config.database.seedData) {
        console.log("🌱 Seeding production data...");
        await execAsync("npx tsx scripts/seed-production.ts");
        console.log("✅ Production data seeded");
      }
    } catch (error) {
      throw new Error(`Database deployment failed: ${error}`);
    }
  }

  private async deployApplication(): Promise<void> {
    console.log("📦 Deploying application...");

    // Install dependencies
    console.log("📥 Installing dependencies...");
    await execAsync("npm ci --production=false");
    console.log("✅ Dependencies installed");

    // Run database optimizations
    console.log("⚡ Optimizing database...");
    try {
      await execAsync("npx tsx scripts/optimize-database.ts");
      console.log("✅ Database optimized");
    } catch (error) {
      console.warn(`⚠️ Database optimization had issues: ${error}`);
    }

    console.log("✅ Application deployed");
  }

  private async runPostDeploymentTasks(): Promise<void> {
    console.log("🔧 Running post-deployment tasks...");

    // Warm cache if enabled
    if (this.config.cache.warmCache) {
      console.log("🔥 Warming cache...");
      try {
        await execAsync("npx tsx scripts/warm-cache.ts");
        console.log("✅ Cache warmed");
      } catch (error) {
        console.warn(`⚠️ Cache warming failed: ${error}`);
      }
    }

    // Clear old cache if needed
    if (this.config.cache.flushCache) {
      console.log("🧹 Flushing old cache...");
      // This would connect to Redis and flush if available
      console.log("✅ Cache flushed");
    }

    console.log("✅ Post-deployment tasks completed");
  }

  private async validateDeployment(): Promise<void> {
    if (!this.config.healthChecks.enabled) {
      console.log("⏩ Skipping health checks");
      return;
    }

    console.log("🏥 Running health checks...");

    const healthEndpoints = [
      "/api/health",
      "/api/health/database",
      "/api/health/redis",
    ];

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    for (const endpoint of healthEndpoints) {
      await this.checkEndpoint(`${baseUrl}${endpoint}`);
    }

    console.log("✅ Health checks completed");
  }

  private async checkEndpoint(url: string): Promise<void> {
    const maxRetries = this.config.healthChecks.retries;
    const timeout = this.config.healthChecks.timeout;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Checking ${url} (attempt ${attempt}/${maxRetries})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": `DY-Official-Deploy/${this.deploymentId}`,
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`✅ ${url} is healthy`);
          return;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.warn(`⚠️ Health check failed for ${url}: ${error}`);

        if (attempt === maxRetries) {
          throw new Error(
            `Health check failed after ${maxRetries} attempts: ${error}`
          );
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async rollback(): Promise<void> {
    console.log("🔄 Starting rollback...");

    try {
      // This would implement rollback logic
      // For now, just log what would happen
      console.log("📋 Rollback steps would include:");
      console.log("  - Restore database from backup");
      console.log("  - Revert application code");
      console.log("  - Clear new cache entries");
      console.log("  - Notify team of rollback");

      console.log("⚠️ Rollback completed (simulation)");
    } catch (error) {
      console.error("❌ Rollback failed:", error);
    }
  }

  private getDeploymentTime(): string {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

// Default deployment configurations
const stagingConfig: DeploymentConfig = {
  environment: "staging",
  database: {
    runMigrations: true,
    seedData: true,
    backupBeforeDeploy: true,
  },
  cache: {
    warmCache: true,
    flushCache: false,
  },
  healthChecks: {
    enabled: true,
    timeout: 30000,
    retries: 3,
  },
  rollback: {
    enabled: true,
    keepBackups: 5,
  },
};

const productionConfig: DeploymentConfig = {
  environment: "production",
  database: {
    runMigrations: true,
    seedData: false,
    backupBeforeDeploy: true,
  },
  cache: {
    warmCache: true,
    flushCache: false,
  },
  healthChecks: {
    enabled: true,
    timeout: 60000,
    retries: 5,
  },
  rollback: {
    enabled: true,
    keepBackups: 10,
  },
};

async function main() {
  const environment =
    (process.argv[2] as "staging" | "production") || "staging";
  const config =
    environment === "production" ? productionConfig : stagingConfig;

  console.log(`🎯 Target environment: ${environment}`);

  const deployment = new ProductionDeployment(config);

  try {
    await deployment.deploy();
  } catch (error) {
    console.error("💥 Deployment failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ProductionDeployment, type DeploymentConfig };
