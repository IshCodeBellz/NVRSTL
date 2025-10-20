#!/usr/bin/env node

/**
 * Production Deployment Validation Script
 *
 * Comprehensive validation of production readiness including:
 * - Environment variables
 * - Database connectivity and schema
 * - External service connectivity
 * - Performance benchmarks
 * - Security checks
 *
 * Usage: node scripts/validate-deployment.js
 */

const { execSync } = require("child_process");
const https = require("https");
const fs = require("fs");
const path = require("path");

class DeploymentValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
    };
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    const symbols = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };

    console.log(`${symbols[level]} ${message}`);
    if (details) {
      console.log(`   ${details}`);
    }

    this.results.tests.push({
      timestamp,
      level,
      message,
      details,
    });

    if (level === "success") this.results.passed++;
    if (level === "error") this.results.failed++;
    if (level === "warning") this.results.warnings++;
  }

  async validateEnvironment() {
    console.log("\n🔍 Environment Validation");
    console.log("=".repeat(40));

    // Check if production env exists
    const envPath = path.join(__dirname, "..", ".env.production");
    if (!fs.existsSync(envPath)) {
      this.log(
        "error",
        "Production environment file missing",
        "Run: node scripts/configure-production.js to create it"
      );
      return false;
    }

    try {
      // Load and validate production environment
      const envContent = fs.readFileSync(envPath, "utf8");
      const requiredVars = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];

      const missingVars = [];
      for (const varName of requiredVars) {
        if (
          !envContent.includes(`${varName}=`) ||
          envContent.includes(`${varName}=""`)
        ) {
          missingVars.push(varName);
        }
      }

      if (missingVars.length > 0) {
        this.log(
          "error",
          "Missing required environment variables",
          `Missing: ${missingVars.join(", ")}`
        );
        return false;
      }

      this.log("success", "Environment configuration is valid");
      return true;
    } catch (error) {
      this.log("error", "Failed to validate environment", error.message);
      return false;
    }
  }

  async validateDatabase() {
    console.log("\n🗄️  Database Validation");
    console.log("=".repeat(40));

    try {
      // Test database connectivity
      const result = execSync("npx prisma db push --preview-feature", {
        encoding: "utf8",
        stdio: "pipe",
      });

      this.log("success", "Database connection successful");

      // Check critical tables exist
      const checkTablesScript = `
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        async function checkTables() {
          try {
            await prisma.user.findFirst();
            await prisma.product.findFirst(); 
            await prisma.order.findFirst();
            console.log('Tables verified');
            process.exit(0);
          } catch (error) {
            console.error('Table check failed:', error.message);
            process.exit(1);
          } finally {
            await prisma.$disconnect();
          }
        }
        
        checkTables();
      `;

      fs.writeFileSync("/tmp/check-tables.js", checkTablesScript);
      execSync("node /tmp/check-tables.js", { encoding: "utf8" });
      fs.unlinkSync("/tmp/check-tables.js");

      this.log("success", "Database schema validation passed");
      return true;
    } catch (error) {
      this.log("error", "Database validation failed", error.message);
      return false;
    }
  }

  async validateServices() {
    console.log("\n🌐 External Services Validation");
    console.log("=".repeat(40));

    const services = [
      {
        name: "Application Health Check",
        url: "http://localhost:3000/api/health",
        required: true,
      },
      {
        name: "Database Health Check",
        url: "http://localhost:3000/api/health/database",
        required: true,
      },
    ];

    let allPassed = true;

    for (const service of services) {
      try {
        await this.checkHttpEndpoint(service.url);
        this.log("success", `${service.name} is accessible`);
      } catch (error) {
        if (service.required) {
          this.log("error", `${service.name} failed`, error.message);
          allPassed = false;
        } else {
          this.log(
            "warning",
            `${service.name} unavailable`,
            "Optional service"
          );
        }
      }
    }

    return allPassed;
  }

  async checkHttpEndpoint(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        timeout: 5000,
      };

      const client = urlObj.protocol === "https:" ? https : require("http");

      const req = client.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });

      req.on("error", reject);
      req.end();
    });
  }

  async validatePerformance() {
    console.log("\n⚡ Performance Validation");
    console.log("=".repeat(40));

    try {
      // Run database optimization check
      execSync("npx tsx scripts/optimize-database.ts", {
        encoding: "utf8",
        stdio: "pipe",
      });
      this.log("success", "Database optimization completed");

      // Check if Redis is configured
      const envPath = path.join(__dirname, "..", ".env.production");
      const envContent = fs.readFileSync(envPath, "utf8");

      if (
        envContent.includes("REDIS_URL=") &&
        !envContent.includes('REDIS_URL=""')
      ) {
        this.log("success", "Redis caching is configured");
      } else {
        this.log(
          "warning",
          "Redis caching not configured",
          "Performance may be impacted"
        );
      }

      return true;
    } catch (error) {
      this.log("warning", "Performance validation had issues", error.message);
      return true; // Don't fail deployment for performance warnings
    }
  }

  async validateSecurity() {
    console.log("\n🔒 Security Validation");
    console.log("=".repeat(40));

    const envPath = path.join(__dirname, "..", ".env.production");
    const envContent = fs.readFileSync(envPath, "utf8");

    // Check for secure secrets
    const secrets = ["NEXTAUTH_SECRET", "STRIPE_SECRET_KEY"];
    for (const secret of secrets) {
      if (envContent.includes(`${secret}=`)) {
        const match = envContent.match(new RegExp(`${secret}="([^"]*)"`));
        if (match && match[1] && match[1].length >= 32) {
          this.log("success", `${secret} has sufficient length`);
        } else {
          this.log(
            "warning",
            `${secret} may be too short`,
            "Use 32+ character secrets"
          );
        }
      }
    }

    // Check HTTPS configuration
    if (envContent.includes('NEXTAUTH_URL="https://')) {
      this.log("success", "HTTPS configuration detected");
    } else {
      this.log("error", "HTTPS not configured", "Production must use HTTPS");
      return false;
    }

    // Check for development values
    const devPatterns = [
      "localhost",
      "example.com",
      "your-domain.com",
      "test-key",
      "sandbox",
    ];

    let hasDevValues = false;
    for (const pattern of devPatterns) {
      if (envContent.toLowerCase().includes(pattern)) {
        this.log(
          "warning",
          `Development value detected: ${pattern}`,
          "Ensure all values are production-ready"
        );
        hasDevValues = true;
      }
    }

    if (!hasDevValues) {
      this.log("success", "No development values detected");
    }

    return true;
  }

  async generateReport() {
    console.log("\n📊 Deployment Validation Report");
    console.log("=".repeat(50));
    console.log(`✅ Tests Passed: ${this.results.passed}`);
    console.log(`❌ Tests Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    console.log(`📝 Total Tests: ${this.results.tests.length}`);

    const success = this.results.failed === 0;
    const reportPath = path.join(
      __dirname,
      "..",
      "deployment-validation-report.json"
    );

    const report = {
      timestamp: new Date().toISOString(),
      success,
      summary: this.results,
      recommendation: success ? "READY_FOR_DEPLOYMENT" : "NEEDS_ATTENTION",
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log("\n" + "=".repeat(50));
    if (success) {
      console.log("🚀 DEPLOYMENT VALIDATION PASSED");
      console.log("✅ System is ready for production deployment");
    } else {
      console.log("🛑 DEPLOYMENT VALIDATION FAILED");
      console.log("❌ Please fix the issues above before deploying");
    }
    console.log(`📄 Full report saved to: ${reportPath}`);

    return success;
  }

  async run() {
    console.log("🔍 DY Official - Production Deployment Validation");
    console.log("=".repeat(60));

    const validationSteps = [
      { name: "Environment", method: this.validateEnvironment },
      { name: "Database", method: this.validateDatabase },
      { name: "Services", method: this.validateServices },
      { name: "Performance", method: this.validatePerformance },
      { name: "Security", method: this.validateSecurity },
    ];

    let allPassed = true;

    for (const step of validationSteps) {
      try {
        const result = await step.method.call(this);
        if (!result) allPassed = false;
      } catch (error) {
        this.log("error", `${step.name} validation failed`, error.message);
        allPassed = false;
      }
    }

    const success = await this.generateReport();
    process.exit(success ? 0 : 1);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new DeploymentValidator();
  validator.run().catch(console.error);
}

module.exports = DeploymentValidator;
