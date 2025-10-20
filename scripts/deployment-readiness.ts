#!/usr/bin/env node

import { spawn } from "child_process";
import { existsSync } from "fs";

const COLORS = {
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  MAGENTA: "\x1b[35m",
  CYAN: "\x1b[36m",
  WHITE: "\x1b[37m",
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
};

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
  action?: string;
}

class DeploymentReadinessChecker {
  private results: CheckResult[] = [];

  private log(message: string, color: string = COLORS.WHITE) {
    console.log(`${color}${message}${COLORS.RESET}`);
  }

  private addResult(result: CheckResult) {
    this.results.push(result);
    const icon =
      result.status === "pass"
        ? "✅"
        : result.status === "warning"
        ? "⚠️"
        : "❌";
    const color =
      result.status === "pass"
        ? COLORS.GREEN
        : result.status === "warning"
        ? COLORS.YELLOW
        : COLORS.RED;

    this.log(
      `${icon} ${result.name}: ${color}${result.message}${COLORS.RESET}`
    );
    if (result.action) {
      this.log(`   💡 ${result.action}`, COLORS.CYAN);
    }
  }

  private async runCommand(
    command: string,
    args: string[]
  ): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      try {
        const process = spawn(command, args, { stdio: "pipe" });
        let output = "";

        process.stdout?.on("data", (data) => {
          output += data.toString();
        });

        process.stderr?.on("data", (data) => {
          output += data.toString();
        });

        process.on("close", (code) => {
          resolve({ success: code === 0, output });
        });

        process.on("error", (error) => {
          resolve({ success: false, output: error.message });
        });
      } catch (error) {
        resolve({ success: false, output: `Command failed: ${error}` });
      }
    });
  }

  async checkEnvironmentFiles() {
    this.log("\n🔍 Checking Environment Files...", COLORS.BOLD);

    // Check .env.production exists
    if (existsSync(".env.production")) {
      this.addResult({
        name: "Production Environment File",
        status: "pass",
        message: ".env.production file exists",
      });
    } else {
      this.addResult({
        name: "Production Environment File",
        status: "fail",
        message: ".env.production file missing",
        action: "Copy from .env.production.template and configure values",
      });
    }

    // Check template exists
    if (existsSync(".env.production.template")) {
      this.addResult({
        name: "Environment Template",
        status: "pass",
        message: ".env.production.template exists",
      });
    } else {
      this.addResult({
        name: "Environment Template",
        status: "warning",
        message: "Template file missing",
        action: "Create template for future deployments",
      });
    }
  }

  async checkDependencies() {
    this.log("\n📦 Checking Dependencies...", COLORS.BOLD);

    // Check if node_modules exists
    if (existsSync("node_modules")) {
      this.addResult({
        name: "Node Modules",
        status: "pass",
        message: "Dependencies installed",
      });
    } else {
      this.addResult({
        name: "Node Modules",
        status: "fail",
        message: "Dependencies not installed",
        action: "Run npm install or npm ci",
      });
    }

    // Check package.json
    if (existsSync("package.json")) {
      this.addResult({
        name: "Package Configuration",
        status: "pass",
        message: "package.json exists",
      });
    } else {
      this.addResult({
        name: "Package Configuration",
        status: "fail",
        message: "package.json missing",
      });
    }
  }

  async checkBuildArtifacts() {
    this.log("\n🏗️ Checking Build Artifacts...", COLORS.BOLD);

    // Check if build exists
    if (existsSync(".next")) {
      this.addResult({
        name: "Next.js Build",
        status: "pass",
        message: "Build artifacts exist",
      });
    } else {
      this.addResult({
        name: "Next.js Build",
        status: "warning",
        message: "No build artifacts found",
        action: "Run npm run build before deployment",
      });
    }

    // Check Prisma client
    const prismaResult = await this.runCommand("npx", ["prisma", "version"]);
    if (prismaResult.success) {
      this.addResult({
        name: "Prisma Client",
        status: "pass",
        message: "Prisma is configured",
      });
    } else {
      this.addResult({
        name: "Prisma Client",
        status: "fail",
        message: "Prisma not properly configured",
        action: "Run npx prisma generate",
      });
    }
  }

  async checkDockerConfiguration() {
    this.log("\n🐳 Checking Docker Configuration...", COLORS.BOLD);

    // Check Dockerfile
    if (existsSync("Dockerfile")) {
      this.addResult({
        name: "Dockerfile",
        status: "pass",
        message: "Dockerfile exists",
      });
    } else {
      this.addResult({
        name: "Dockerfile",
        status: "warning",
        message: "No Dockerfile found",
        action: "Docker deployment will not be available",
      });
    }

    // Check docker-compose
    if (existsSync("docker-compose.yml") || existsSync("docker-compose.yaml")) {
      this.addResult({
        name: "Docker Compose",
        status: "pass",
        message: "Docker Compose configuration exists",
      });
    } else {
      this.addResult({
        name: "Docker Compose",
        status: "warning",
        message: "No Docker Compose configuration",
        action: "Multi-service deployment will require manual setup",
      });
    }

    // Check if Docker is available
    const dockerResult = await this.runCommand("docker", ["--version"]);
    if (dockerResult.success) {
      this.addResult({
        name: "Docker Engine",
        status: "pass",
        message: "Docker is available",
      });
    } else {
      this.addResult({
        name: "Docker Engine",
        status: "warning",
        message: "Docker not available",
        action: "Install Docker for containerized deployment",
      });
    }
  }

  async checkDeploymentScripts() {
    this.log("\n🚀 Checking Deployment Scripts...", COLORS.BOLD);

    // Check deployment script
    if (existsSync("scripts/deploy-production.sh")) {
      this.addResult({
        name: "Deployment Script",
        status: "pass",
        message: "Production deployment script exists",
      });
    } else {
      this.addResult({
        name: "Deployment Script",
        status: "warning",
        message: "No deployment automation found",
        action: "Manual deployment will be required",
      });
    }

    // Check validation scripts
    if (existsSync("scripts/validate-environment.ts")) {
      this.addResult({
        name: "Environment Validation",
        status: "pass",
        message: "Environment validation script exists",
      });
    } else {
      this.addResult({
        name: "Environment Validation",
        status: "warning",
        message: "No environment validation",
      });
    }
  }

  async checkHealthEndpoints() {
    this.log("\n🏥 Checking Health Endpoints...", COLORS.BOLD);

    const healthEndpoints = [
      "app/api/health/route.ts",
      "app/api/health/database/route.ts",
      "app/api/health/redis/route.ts",
    ];

    let healthEndpointCount = 0;
    healthEndpoints.forEach((endpoint) => {
      if (existsSync(endpoint)) {
        healthEndpointCount++;
      }
    });

    if (healthEndpointCount === healthEndpoints.length) {
      this.addResult({
        name: "Health Check Endpoints",
        status: "pass",
        message: `All ${healthEndpointCount} health endpoints configured`,
      });
    } else if (healthEndpointCount > 0) {
      this.addResult({
        name: "Health Check Endpoints",
        status: "warning",
        message: `${healthEndpointCount}/${healthEndpoints.length} health endpoints configured`,
      });
    } else {
      this.addResult({
        name: "Health Check Endpoints",
        status: "fail",
        message: "No health check endpoints found",
        action: "Create health check endpoints for deployment monitoring",
      });
    }
  }

  async checkSecurityConfiguration() {
    this.log("\n🔒 Checking Security Configuration...", COLORS.BOLD);

    // Check for security headers middleware
    if (existsSync("middleware.ts")) {
      this.addResult({
        name: "Security Middleware",
        status: "pass",
        message: "Middleware configuration exists",
      });
    } else {
      this.addResult({
        name: "Security Middleware",
        status: "warning",
        message: "No middleware configuration found",
        action: "Consider adding security headers and rate limiting",
      });
    }

    // Check for HTTPS configuration
    const nextConfig =
      existsSync("next.config.mjs") || existsSync("next.config.js");
    if (nextConfig) {
      this.addResult({
        name: "Next.js Configuration",
        status: "pass",
        message: "Next.js configuration exists",
      });
    } else {
      this.addResult({
        name: "Next.js Configuration",
        status: "warning",
        message: "No Next.js configuration found",
      });
    }
  }

  generateSummary() {
    this.log("\n📊 Deployment Readiness Summary", COLORS.BOLD);
    this.log("=====================================", COLORS.BOLD);

    const passed = this.results.filter((r) => r.status === "pass").length;
    const warnings = this.results.filter((r) => r.status === "warning").length;
    const failed = this.results.filter((r) => r.status === "fail").length;
    const total = this.results.length;

    this.log(`✅ Passed: ${passed}/${total}`, COLORS.GREEN);
    this.log(`⚠️  Warnings: ${warnings}/${total}`, COLORS.YELLOW);
    this.log(`❌ Failed: ${failed}/${total}`, COLORS.RED);

    const readinessScore = Math.round((passed / total) * 100);
    this.log(
      `\n🎯 Deployment Readiness Score: ${readinessScore}%`,
      COLORS.BOLD
    );

    if (failed > 0) {
      this.log(
        `\n❌ DEPLOYMENT BLOCKED: ${failed} critical issues must be resolved`,
        COLORS.RED + COLORS.BOLD
      );
      return false;
    } else if (warnings > 0) {
      this.log(
        `\n⚠️  DEPLOYMENT READY WITH WARNINGS: ${warnings} recommendations should be addressed`,
        COLORS.YELLOW + COLORS.BOLD
      );
      return true;
    } else {
      this.log(
        `\n✅ DEPLOYMENT READY: All checks passed!`,
        COLORS.GREEN + COLORS.BOLD
      );
      return true;
    }
  }

  async runAllChecks() {
    this.log(
      `${COLORS.CYAN}${COLORS.BOLD}🚀 DY Official - Deployment Readiness Check${COLORS.RESET}`
    );
    this.log(
      `${COLORS.CYAN}==============================================${COLORS.RESET}`
    );

    await this.checkEnvironmentFiles();
    await this.checkDependencies();
    await this.checkBuildArtifacts();
    await this.checkDockerConfiguration();
    await this.checkDeploymentScripts();
    await this.checkHealthEndpoints();
    await this.checkSecurityConfiguration();

    const isReady = this.generateSummary();

    this.log("\n🔗 Next Steps:", COLORS.BOLD);
    if (isReady) {
      this.log(
        "1. Run environment validation: npm run env:validate:production",
        COLORS.GREEN
      );
      this.log(
        "2. Run deployment script: ./scripts/deploy-production.sh",
        COLORS.GREEN
      );
      this.log("3. Monitor health endpoints after deployment", COLORS.GREEN);
    } else {
      this.log("1. Fix all failed checks listed above", COLORS.RED);
      this.log("2. Re-run this readiness check", COLORS.RED);
      this.log("3. Proceed with deployment when ready", COLORS.RED);
    }

    this.log(
      "\n📚 Documentation: ./docs/PRODUCTION_ENVIRONMENT_SETUP.md",
      COLORS.CYAN
    );

    return isReady;
  }
}

async function main() {
  const checker = new DeploymentReadinessChecker();
  const isReady = await checker.runAllChecks();
  process.exit(isReady ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

export { DeploymentReadinessChecker };
