#!/usr/bin/env tsx

/**
 * Production Readiness Validator
 * Final comprehensive check before production deployment
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

interface ReadinessCheck {
  category: string;
  name: string;
  status: "PASS" | "FAIL" | "WARNING" | "INFO";
  description: string;
  requirement: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  details?: string;
  recommendation?: string;
}

class ProductionReadinessValidator {
  private checks: ReadinessCheck[] = [];
  private projectRoot: string;

  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async validateProductionReadiness() {
    console.log("🚀 PRODUCTION READINESS VALIDATION");
    console.log("==================================");
    console.log(`Project: ${this.projectRoot}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log("");

    // Core Infrastructure Checks
    await this.checkCoreInfrastructure();

    // Security Checks
    await this.checkSecurityReadiness();

    // Performance Checks
    await this.checkPerformanceReadiness();

    // Monitoring & Observability
    await this.checkMonitoringReadiness();

    // Documentation & Testing
    await this.checkDocumentationReadiness();

    // Environment Configuration
    await this.checkEnvironmentReadiness();

    // Generate final report
    this.generateReadinessReport();
  }

  private async checkCoreInfrastructure() {
    console.log("🏗️  Checking Core Infrastructure...");

    // Docker configuration
    this.checkFile(
      "Dockerfile",
      "CRITICAL",
      "Docker configuration for containerization"
    );
    this.checkFile(
      "docker-compose.yml",
      "MEDIUM",
      "Docker Compose for local development"
    );

    // Package.json validation
    this.validatePackageJson();

    // Environment files
    this.checkFile(".env.example", "HIGH", "Environment variables template");
    this.checkFile(
      ".env.production",
      "CRITICAL",
      "Production environment configuration"
    );

    // Database configuration
    this.checkFile(
      "prisma/schema.prisma",
      "CRITICAL",
      "Database schema definition"
    );

    // Build configuration
    this.checkFile(
      "next.config.mjs",
      "HIGH",
      "Next.js production configuration"
    );
    this.checkFile("tsconfig.json", "HIGH", "TypeScript configuration");

    console.log("");
  }

  private async checkSecurityReadiness() {
    console.log("🔒 Checking Security Readiness...");

    // Security audit files
    this.checkFile(
      "security-audit/security-audit.ts",
      "CRITICAL",
      "Security audit system"
    );
    this.checkFile(
      "security-audit/webhook-security.ts",
      "HIGH",
      "Webhook security validation"
    );
    this.checkFile(
      "security-audit/ssl-security.ts",
      "HIGH",
      "SSL/TLS security validation"
    );

    // Security middleware
    this.checkFile("middleware.ts", "CRITICAL", "Security middleware");
    this.checkFile("lib/security.ts", "HIGH", "Security utilities");

    // Authentication system
    this.checkDirectory("app/(auth)", "CRITICAL", "Authentication system");
    this.checkDirectory("components/security", "HIGH", "Security components");

    console.log("");
  }

  private async checkPerformanceReadiness() {
    console.log("⚡ Checking Performance Readiness...");

    // Load testing infrastructure
    this.checkFile(
      "load-testing/run-load-tests.ts",
      "HIGH",
      "Load testing system"
    );
    this.checkFile(
      "load-testing/test-database.ts",
      "HIGH",
      "Database performance testing"
    );
    this.checkFile(
      "load-testing/monitor-system.ts",
      "MEDIUM",
      "System monitoring"
    );

    // Performance configuration
    this.checkFile(
      "next.config.mjs",
      "HIGH",
      "Performance optimizations in Next.js config"
    );

    console.log("");
  }

  private async checkMonitoringReadiness() {
    console.log("📊 Checking Monitoring & Observability...");

    // Sentry configuration
    this.checkFile(
      "sentry.client.config.ts",
      "HIGH",
      "Client-side error monitoring"
    );
    this.checkFile(
      "sentry.server.config.ts",
      "HIGH",
      "Server-side error monitoring"
    );
    this.checkFile("instrumentation.ts", "MEDIUM", "Instrumentation setup");

    // Health checks
    this.checkApiRoute("api/health", "HIGH", "Health check endpoint");
    this.checkApiRoute("api/status", "MEDIUM", "Status endpoint");

    console.log("");
  }

  private async checkDocumentationReadiness() {
    console.log("📚 Checking Documentation & Testing...");

    // Core documentation
    this.checkFile("README.md", "CRITICAL", "Project documentation");
    this.checkFile("DEPLOYMENT.md", "HIGH", "Deployment guide");
    this.checkFile("ARCHITECTURE.md", "MEDIUM", "Architecture documentation");

    // Testing configuration
    this.checkFile("jest.config.js", "HIGH", "Testing configuration");
    this.checkDirectory("__tests__", "HIGH", "Test suite");

    // Change management
    this.checkFile("CHANGELOG.md", "MEDIUM", "Change documentation");

    console.log("");
  }

  private async checkEnvironmentReadiness() {
    console.log("🌍 Checking Environment Configuration...");

    // Production configuration
    this.validateEnvironmentVariables();

    // Railway configuration (if using Railway)
    this.checkFile(
      "railway.json",
      "MEDIUM",
      "Railway deployment configuration"
    );

    // Package manager files
    this.checkFile("package-lock.json", "HIGH", "Dependency lock file");

    console.log("");
  }

  private checkFile(
    filePath: string,
    requirement: ReadinessCheck["requirement"],
    description: string
  ) {
    const fullPath = join(this.projectRoot, filePath);
    const exists = existsSync(fullPath);

    this.checks.push({
      category: "Infrastructure",
      name: `File: ${filePath}`,
      status: exists ? "PASS" : "FAIL",
      description,
      requirement,
      details: exists ? "File exists" : "File missing",
      recommendation: exists ? undefined : `Create ${filePath}`,
    });

    const statusIcon = exists ? "✅" : "❌";
    const reqIcon = this.getRequirementIcon(requirement);
    console.log(`  ${statusIcon} ${reqIcon} ${filePath}: ${description}`);
  }

  private checkDirectory(
    dirPath: string,
    requirement: ReadinessCheck["requirement"],
    description: string
  ) {
    const fullPath = join(this.projectRoot, dirPath);
    const exists = existsSync(fullPath);

    this.checks.push({
      category: "Infrastructure",
      name: `Directory: ${dirPath}`,
      status: exists ? "PASS" : "FAIL",
      description,
      requirement,
      details: exists ? "Directory exists" : "Directory missing",
      recommendation: exists ? undefined : `Create ${dirPath}`,
    });

    const statusIcon = exists ? "✅" : "❌";
    const reqIcon = this.getRequirementIcon(requirement);
    console.log(`  ${statusIcon} ${reqIcon} ${dirPath}/: ${description}`);
  }

  private checkApiRoute(
    routePath: string,
    requirement: ReadinessCheck["requirement"],
    description: string
  ) {
    const possiblePaths = [
      join(this.projectRoot, "app", routePath, "route.ts"),
      join(this.projectRoot, "app", routePath, "page.ts"),
      join(this.projectRoot, "pages", routePath + ".ts"),
      join(this.projectRoot, "pages", routePath + ".js"),
    ];

    const exists = possiblePaths.some((path) => existsSync(path));

    this.checks.push({
      category: "API",
      name: `Route: ${routePath}`,
      status: exists ? "PASS" : "FAIL",
      description,
      requirement,
      details: exists ? "API route exists" : "API route missing",
      recommendation: exists ? undefined : `Implement ${routePath} endpoint`,
    });

    const statusIcon = exists ? "✅" : "❌";
    const reqIcon = this.getRequirementIcon(requirement);
    console.log(`  ${statusIcon} ${reqIcon} /${routePath}: ${description}`);
  }

  private validatePackageJson() {
    const packagePath = join(this.projectRoot, "package.json");

    if (!existsSync(packagePath)) {
      this.checks.push({
        category: "Configuration",
        name: "Package.json",
        status: "FAIL",
        description: "Package.json missing",
        requirement: "CRITICAL",
        recommendation: "Create package.json",
      });
      console.log("  ❌ 🚨 package.json: MISSING");
      return;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

      // Check essential scripts
      const requiredScripts = ["build", "start", "dev"];
      const hasRequiredScripts = requiredScripts.every(
        (script) => packageJson.scripts?.[script]
      );

      this.checks.push({
        category: "Configuration",
        name: "Package.json Scripts",
        status: hasRequiredScripts ? "PASS" : "FAIL",
        description: "Essential npm scripts (build, start, dev)",
        requirement: "CRITICAL",
        details: hasRequiredScripts
          ? "All required scripts present"
          : "Missing required scripts",
        recommendation: hasRequiredScripts
          ? undefined
          : "Add missing scripts to package.json",
      });

      const statusIcon = hasRequiredScripts ? "✅" : "❌";
      console.log(
        `  ${statusIcon} 🚨 package.json scripts: Essential npm scripts`
      );

      // Check production dependencies
      const hasDependencies =
        packageJson.dependencies &&
        Object.keys(packageJson.dependencies).length > 0;

      this.checks.push({
        category: "Configuration",
        name: "Production Dependencies",
        status: hasDependencies ? "PASS" : "WARNING",
        description: "Production dependencies configured",
        requirement: "HIGH",
        details: hasDependencies
          ? `${Object.keys(packageJson.dependencies).length} dependencies`
          : "No dependencies",
      });
    } catch (error) {
      this.checks.push({
        category: "Configuration",
        name: "Package.json Validation",
        status: "FAIL",
        description: "Package.json validation failed",
        requirement: "CRITICAL",
        details: "Invalid JSON format",
        recommendation: "Fix package.json syntax",
      });
      console.log("  ❌ 🚨 package.json: INVALID JSON");
    }
  }

  private validateEnvironmentVariables() {
    const requiredEnvVars = [
      "DATABASE_URL",
      "NEXTAUTH_SECRET",
      "NEXTAUTH_URL",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ];

    const envExamplePath = join(this.projectRoot, ".env.example");

    if (existsSync(envExamplePath)) {
      try {
        const envExample = readFileSync(envExamplePath, "utf8");
        const hasAllRequired = requiredEnvVars.every((envVar) =>
          envExample.includes(envVar)
        );

        this.checks.push({
          category: "Environment",
          name: "Environment Variables Template",
          status: hasAllRequired ? "PASS" : "WARNING",
          description: "Required environment variables documented",
          requirement: "HIGH",
          details: hasAllRequired
            ? "All required vars documented"
            : "Some required vars missing",
          recommendation: hasAllRequired
            ? undefined
            : "Document all required environment variables",
        });

        const statusIcon = hasAllRequired ? "✅" : "⚠️";
        console.log(
          `  ${statusIcon} 📋 Environment variables: Template completeness`
        );
      } catch (error) {
        console.log("  ⚠️  📋 Environment variables: Unable to validate");
      }
    }
  }

  private getRequirementIcon(
    requirement: ReadinessCheck["requirement"]
  ): string {
    return {
      CRITICAL: "🚨",
      HIGH: "🔥",
      MEDIUM: "📋",
      LOW: "ℹ️",
    }[requirement];
  }

  private generateReadinessReport() {
    console.log("🎯 PRODUCTION READINESS REPORT");
    console.log("==============================");

    const summary = {
      total: this.checks.length,
      pass: this.checks.filter((c) => c.status === "PASS").length,
      fail: this.checks.filter((c) => c.status === "FAIL").length,
      warning: this.checks.filter((c) => c.status === "WARNING").length,
    };

    const criticalFails = this.checks.filter(
      (c) => c.status === "FAIL" && c.requirement === "CRITICAL"
    ).length;
    const highFails = this.checks.filter(
      (c) => c.status === "FAIL" && c.requirement === "HIGH"
    ).length;

    console.log(`Total Checks: ${summary.total}`);
    console.log(`✅ Passed: ${summary.pass}`);
    console.log(`❌ Failed: ${summary.fail}`);
    console.log(`⚠️  Warnings: ${summary.warning}`);
    console.log("");

    // Calculate readiness score
    const score = Math.round((summary.pass / summary.total) * 100);
    console.log(`📊 Readiness Score: ${score}%`);
    console.log("");

    // Critical failures
    if (criticalFails > 0) {
      console.log("🚨 CRITICAL FAILURES (MUST FIX)");
      console.log("===============================");
      this.checks
        .filter((c) => c.status === "FAIL" && c.requirement === "CRITICAL")
        .forEach((check) => {
          console.log(`❌ ${check.name}: ${check.description}`);
          if (check.recommendation) {
            console.log(`   💡 ${check.recommendation}`);
          }
        });
      console.log("");
    }

    // High priority failures
    if (highFails > 0) {
      console.log("🔥 HIGH PRIORITY FAILURES");
      console.log("=========================");
      this.checks
        .filter((c) => c.status === "FAIL" && c.requirement === "HIGH")
        .forEach((check) => {
          console.log(`❌ ${check.name}: ${check.description}`);
          if (check.recommendation) {
            console.log(`   💡 ${check.recommendation}`);
          }
        });
      console.log("");
    }

    // Final assessment
    console.log("🎯 PRODUCTION READINESS ASSESSMENT");
    console.log("==================================");

    if (criticalFails > 0) {
      console.log("🚨 NOT READY FOR PRODUCTION");
      console.log("   → Critical failures must be resolved");
      console.log("   → DO NOT DEPLOY until all critical issues fixed");
    } else if (score >= 90 && highFails === 0) {
      console.log("🏆 EXCELLENT - READY FOR PRODUCTION");
      console.log("   → All critical requirements met");
      console.log("   → Deployment can proceed confidently");
    } else if (score >= 80) {
      console.log("✅ GOOD - READY FOR PRODUCTION");
      console.log("   → Core requirements met");
      console.log("   → Consider addressing warnings for optimal setup");
    } else if (score >= 70) {
      console.log("⚠️  ACCEPTABLE - PROCEED WITH CAUTION");
      console.log("   → Basic requirements met");
      console.log("   → Address high priority items before production");
    } else {
      console.log("❌ NOT READY FOR PRODUCTION");
      console.log("   → Insufficient readiness score");
      console.log("   → Significant improvements needed");
    }

    console.log("");
    console.log("📅 DEPLOYMENT CHECKLIST");
    console.log("=======================");
    console.log("□ Environment variables configured");
    console.log("□ Database migrations applied");
    console.log("□ SSL certificate configured");
    console.log("□ Domain DNS configured");
    console.log("□ Monitoring alerts configured");
    console.log("□ Backup procedures tested");
    console.log("□ Rollback plan prepared");
    console.log("□ Security audit completed");
    console.log("□ Load testing completed");
    console.log("□ Team deployment briefing completed");
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  let projectRoot = process.cwd();

  if (args.includes("--help")) {
    console.log(
      "Usage: npx tsx production-readiness.ts [--path <project-path>]"
    );
    return;
  }

  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === "--path") {
      projectRoot = args[i + 1] || projectRoot;
    }
  }

  const validator = new ProductionReadinessValidator(projectRoot);
  await validator.validateProductionReadiness();
}

if (require.main === module) {
  main().catch(console.error);
}

export { ProductionReadinessValidator };
