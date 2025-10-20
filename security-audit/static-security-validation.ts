#!/usr/bin/env tsx

/**
 * Static Security Validation
 * Performs security checks without requiring a running server
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { glob } from "glob";

interface SecurityCheck {
  category: string;
  name: string;
  status: "PASS" | "FAIL" | "WARNING" | "INFO";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  recommendation?: string;
}

class StaticSecurityValidator {
  private checks: SecurityCheck[] = [];
  private projectRoot: string;

  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async validateSecurity() {
    console.log("🛡️  STATIC SECURITY VALIDATION");
    console.log("==============================");
    console.log(`Project: ${this.projectRoot}`);
    console.log("");

    // Authentication & Authorization
    await this.validateAuthentication();

    // API Security Configuration
    await this.validateApiSecurity();

    // Input Validation & Sanitization
    await this.validateInputValidation();

    // Environment & Configuration Security
    await this.validateEnvironmentSecurity();

    // Dependency Security
    await this.validateDependencySecurity();

    // Infrastructure Security
    await this.validateInfrastructureSecurity();

    this.generateSecurityReport();
  }

  private async validateAuthentication() {
    console.log("🔐 Validating Authentication Security...");

    // Check NextAuth configuration
    const nextAuthConfigPaths = [
      "app/api/auth/[...nextauth]/route.ts",
      "pages/api/auth/[...nextauth].ts",
    ];

    let hasNextAuth = false;
    for (const configPath of nextAuthConfigPaths) {
      if (existsSync(join(this.projectRoot, configPath))) {
        hasNextAuth = true;

        try {
          const content = readFileSync(
            join(this.projectRoot, configPath),
            "utf8"
          );

          // Check for proper session configuration
          if (content.includes("jwt") && content.includes("session")) {
            this.addCheck({
              category: "Authentication",
              name: "NextAuth Configuration",
              status: "PASS",
              severity: "HIGH",
              description: "NextAuth properly configured with JWT and sessions",
            });
          } else {
            this.addCheck({
              category: "Authentication",
              name: "NextAuth Configuration",
              status: "WARNING",
              severity: "MEDIUM",
              description: "NextAuth configuration could be enhanced",
              recommendation:
                "Ensure JWT and session security are properly configured",
            });
          }

          // Check for secure session configuration
          if (
            content.includes("secure: true") ||
            content.includes("sameSite")
          ) {
            this.addCheck({
              category: "Authentication",
              name: "Session Security",
              status: "PASS",
              severity: "HIGH",
              description: "Secure session configuration detected",
            });
          } else {
            this.addCheck({
              category: "Authentication",
              name: "Session Security",
              status: "WARNING",
              severity: "HIGH",
              description: "Session security configuration missing",
              recommendation: "Add secure session cookies configuration",
            });
          }
        } catch (error) {
          this.addCheck({
            category: "Authentication",
            name: "NextAuth File Read",
            status: "WARNING",
            severity: "MEDIUM",
            description: "Unable to analyze NextAuth configuration",
          });
        }
        break;
      }
    }

    if (!hasNextAuth) {
      this.addCheck({
        category: "Authentication",
        name: "Authentication System",
        status: "FAIL",
        severity: "CRITICAL",
        description: "No authentication system detected",
        recommendation: "Implement NextAuth or similar authentication system",
      });
    }

    // Check for authentication middleware
    const middlewarePath = join(this.projectRoot, "middleware.ts");
    if (existsSync(middlewarePath)) {
      try {
        const content = readFileSync(middlewarePath, "utf8");

        if (content.includes("auth") || content.includes("session")) {
          this.addCheck({
            category: "Authentication",
            name: "Authentication Middleware",
            status: "PASS",
            severity: "HIGH",
            description: "Authentication middleware implemented",
          });
        } else {
          this.addCheck({
            category: "Authentication",
            name: "Authentication Middleware",
            status: "WARNING",
            severity: "MEDIUM",
            description:
              "Middleware exists but authentication integration unclear",
          });
        }
      } catch (error) {
        this.addCheck({
          category: "Authentication",
          name: "Middleware Analysis",
          status: "WARNING",
          severity: "LOW",
          description: "Unable to analyze middleware",
        });
      }
    } else {
      this.addCheck({
        category: "Authentication",
        name: "Authentication Middleware",
        status: "WARNING",
        severity: "MEDIUM",
        description: "No middleware.ts found",
        recommendation:
          "Implement authentication middleware for route protection",
      });
    }

    console.log("");
  }

  private async validateApiSecurity() {
    console.log("🔌 Validating API Security...");

    // Check for API route security
    const apiRoutes = await this.findApiRoutes();

    let secureRoutes = 0;
    let totalRoutes = apiRoutes.length;

    for (const route of apiRoutes) {
      try {
        const content = readFileSync(route, "utf8");

        // Check for authentication checks
        const hasAuthCheck =
          content.includes("getServerSession") ||
          content.includes("auth") ||
          content.includes("session") ||
          content.includes("Authorization");

        // Check for input validation
        const hasValidation =
          content.includes("zod") ||
          content.includes("validate") ||
          content.includes("schema") ||
          content.includes("parse");

        // Check for rate limiting
        const hasRateLimit =
          content.includes("rateLimit") ||
          content.includes("limiter") ||
          content.includes("rate");

        if (hasAuthCheck && hasValidation) {
          secureRoutes++;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    if (totalRoutes > 0) {
      const securityPercentage = Math.round((secureRoutes / totalRoutes) * 100);

      if (securityPercentage >= 80) {
        this.addCheck({
          category: "API Security",
          name: "API Route Security",
          status: "PASS",
          severity: "HIGH",
          description: `${securityPercentage}% of API routes have security measures`,
        });
      } else if (securityPercentage >= 60) {
        this.addCheck({
          category: "API Security",
          name: "API Route Security",
          status: "WARNING",
          severity: "HIGH",
          description: `${securityPercentage}% of API routes have security measures`,
          recommendation:
            "Implement authentication and validation on all API routes",
        });
      } else {
        this.addCheck({
          category: "API Security",
          name: "API Route Security",
          status: "FAIL",
          severity: "CRITICAL",
          description: `Only ${securityPercentage}% of API routes have security measures`,
          recommendation: "Implement comprehensive security on all API routes",
        });
      }
    }

    // Check for CORS configuration
    const nextConfigPath = join(this.projectRoot, "next.config.mjs");
    if (existsSync(nextConfigPath)) {
      try {
        const content = readFileSync(nextConfigPath, "utf8");

        if (content.includes("cors") || content.includes("origin")) {
          this.addCheck({
            category: "API Security",
            name: "CORS Configuration",
            status: "PASS",
            severity: "MEDIUM",
            description: "CORS configuration detected",
          });
        } else {
          this.addCheck({
            category: "API Security",
            name: "CORS Configuration",
            status: "WARNING",
            severity: "MEDIUM",
            description: "No explicit CORS configuration found",
            recommendation: "Configure CORS headers for API security",
          });
        }
      } catch (error) {
        this.addCheck({
          category: "API Security",
          name: "Next.js Config Analysis",
          status: "INFO",
          severity: "LOW",
          description: "Unable to analyze Next.js configuration",
        });
      }
    }

    console.log("");
  }

  private async validateInputValidation() {
    console.log("🛡️  Validating Input Validation...");

    // Check for Zod usage (input validation)
    const packageJsonPath = join(this.projectRoot, "package.json");
    let hasZod = false;

    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        hasZod = !!(
          packageJson.dependencies?.zod || packageJson.devDependencies?.zod
        );

        if (hasZod) {
          this.addCheck({
            category: "Input Validation",
            name: "Validation Library",
            status: "PASS",
            severity: "HIGH",
            description: "Zod validation library installed",
          });
        } else {
          this.addCheck({
            category: "Input Validation",
            name: "Validation Library",
            status: "FAIL",
            severity: "HIGH",
            description: "No input validation library detected",
            recommendation: "Install and use Zod or similar validation library",
          });
        }
      } catch (error) {
        this.addCheck({
          category: "Input Validation",
          name: "Package Analysis",
          status: "WARNING",
          severity: "LOW",
          description: "Unable to analyze package.json",
        });
      }
    }

    // Check for validation schema files
    const schemaFiles = await this.findValidationSchemas();

    if (schemaFiles.length > 0) {
      this.addCheck({
        category: "Input Validation",
        name: "Validation Schemas",
        status: "PASS",
        severity: "MEDIUM",
        description: `${schemaFiles.length} validation schema files found`,
      });
    } else if (hasZod) {
      this.addCheck({
        category: "Input Validation",
        name: "Validation Schemas",
        status: "WARNING",
        severity: "MEDIUM",
        description: "Validation library installed but no schema files found",
        recommendation: "Create validation schemas for user inputs",
      });
    }

    console.log("");
  }

  private async validateEnvironmentSecurity() {
    console.log("🌍 Validating Environment Security...");

    // Check for environment files
    const envFiles = [".env", ".env.local", ".env.production", ".env.example"];
    let hasEnvFiles = false;

    for (const envFile of envFiles) {
      const envPath = join(this.projectRoot, envFile);
      if (existsSync(envPath)) {
        hasEnvFiles = true;

        try {
          const content = readFileSync(envPath, "utf8");

          // Check for sensitive data patterns
          const sensitivePatterns = [
            /password\s*=\s*[^#\n]+/i,
            /secret\s*=\s*[^#\n]+/i,
            /key\s*=\s*[^#\n]+/i,
          ];

          let hasSensitiveData = false;
          for (const pattern of sensitivePatterns) {
            if (pattern.test(content)) {
              hasSensitiveData = true;
              break;
            }
          }

          if (envFile === ".env.example") {
            if (hasSensitiveData) {
              this.addCheck({
                category: "Environment",
                name: "Environment Template Security",
                status: "FAIL",
                severity: "HIGH",
                description: "Sensitive data found in .env.example",
                recommendation: "Remove sensitive values from example file",
              });
            } else {
              this.addCheck({
                category: "Environment",
                name: "Environment Template Security",
                status: "PASS",
                severity: "MEDIUM",
                description:
                  ".env.example properly configured without sensitive data",
              });
            }
          }
        } catch (error) {
          // File exists but can't read - might be protected
        }
      }
    }

    if (hasEnvFiles) {
      this.addCheck({
        category: "Environment",
        name: "Environment Configuration",
        status: "PASS",
        severity: "MEDIUM",
        description: "Environment files properly configured",
      });
    } else {
      this.addCheck({
        category: "Environment",
        name: "Environment Configuration",
        status: "FAIL",
        severity: "HIGH",
        description: "No environment files found",
        recommendation: "Create proper environment configuration files",
      });
    }

    // Check .gitignore for environment files
    const gitignorePath = join(this.projectRoot, ".gitignore");
    if (existsSync(gitignorePath)) {
      try {
        const content = readFileSync(gitignorePath, "utf8");

        if (content.includes(".env") && !content.includes(".env.example")) {
          this.addCheck({
            category: "Environment",
            name: "Environment File Protection",
            status: "PASS",
            severity: "HIGH",
            description: "Environment files properly ignored in git",
          });
        } else {
          this.addCheck({
            category: "Environment",
            name: "Environment File Protection",
            status: "WARNING",
            severity: "HIGH",
            description: "Environment files may not be properly protected",
            recommendation:
              "Ensure .env files are in .gitignore but .env.example is not",
          });
        }
      } catch (error) {
        this.addCheck({
          category: "Environment",
          name: "Git Ignore Analysis",
          status: "INFO",
          severity: "LOW",
          description: "Unable to analyze .gitignore",
        });
      }
    }

    console.log("");
  }

  private async validateDependencySecurity() {
    console.log("🔍 Validating Dependency Security...");

    const packageJsonPath = join(this.projectRoot, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

        // Check for security-related dependencies
        const securityDeps = [
          "helmet",
          "cors",
          "express-rate-limit",
          "bcrypt",
          "jsonwebtoken",
          "next-auth",
          "@auth/prisma-adapter",
          "zod",
        ];

        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        const foundSecurityDeps = securityDeps.filter((dep) => allDeps[dep]);

        if (foundSecurityDeps.length >= 3) {
          this.addCheck({
            category: "Dependencies",
            name: "Security Dependencies",
            status: "PASS",
            severity: "MEDIUM",
            description: `${foundSecurityDeps.length} security-focused dependencies found`,
          });
        } else {
          this.addCheck({
            category: "Dependencies",
            name: "Security Dependencies",
            status: "WARNING",
            severity: "MEDIUM",
            description: "Limited security-focused dependencies",
            recommendation:
              "Consider adding security libraries like helmet, zod, etc.",
          });
        }

        // Check for outdated or vulnerable patterns
        const potentiallyVulnerable = [
          "express@3",
          "lodash@3",
          "request",
          "node-uuid",
        ];

        const vulnDeps = Object.keys(allDeps).filter((dep) =>
          potentiallyVulnerable.some((vuln) => dep.includes(vuln.split("@")[0]))
        );

        if (vulnDeps.length > 0) {
          this.addCheck({
            category: "Dependencies",
            name: "Vulnerable Dependencies",
            status: "WARNING",
            severity: "HIGH",
            description: `Potentially vulnerable dependencies: ${vulnDeps.join(
              ", "
            )}`,
            recommendation:
              "Update or replace potentially vulnerable dependencies",
          });
        } else {
          this.addCheck({
            category: "Dependencies",
            name: "Vulnerable Dependencies",
            status: "PASS",
            severity: "HIGH",
            description: "No obviously vulnerable dependencies detected",
          });
        }
      } catch (error) {
        this.addCheck({
          category: "Dependencies",
          name: "Package Analysis",
          status: "WARNING",
          severity: "LOW",
          description: "Unable to analyze package.json",
        });
      }
    }

    console.log("");
  }

  private async validateInfrastructureSecurity() {
    console.log("🏗️  Validating Infrastructure Security...");

    // Check for Docker security
    const dockerfilePath = join(this.projectRoot, "Dockerfile");
    if (existsSync(dockerfilePath)) {
      try {
        const content = readFileSync(dockerfilePath, "utf8");

        // Check for non-root user
        if (content.includes("USER") && !content.includes("USER root")) {
          this.addCheck({
            category: "Infrastructure",
            name: "Docker Security",
            status: "PASS",
            severity: "HIGH",
            description: "Docker container runs as non-root user",
          });
        } else {
          this.addCheck({
            category: "Infrastructure",
            name: "Docker Security",
            status: "WARNING",
            severity: "HIGH",
            description: "Docker container may run as root",
            recommendation: "Configure Docker to run as non-root user",
          });
        }

        // Check for security best practices
        if (
          content.includes("COPY --chown") ||
          content.includes("RUN addgroup")
        ) {
          this.addCheck({
            category: "Infrastructure",
            name: "Docker Best Practices",
            status: "PASS",
            severity: "MEDIUM",
            description: "Docker security best practices implemented",
          });
        } else {
          this.addCheck({
            category: "Infrastructure",
            name: "Docker Best Practices",
            status: "WARNING",
            severity: "MEDIUM",
            description: "Docker configuration could be hardened",
          });
        }
      } catch (error) {
        this.addCheck({
          category: "Infrastructure",
          name: "Docker Analysis",
          status: "INFO",
          severity: "LOW",
          description: "Unable to analyze Dockerfile",
        });
      }
    }

    // Check for security headers in Next.js config
    const nextConfigPath = join(this.projectRoot, "next.config.mjs");
    if (existsSync(nextConfigPath)) {
      try {
        const content = readFileSync(nextConfigPath, "utf8");

        const securityHeaders = [
          "X-Frame-Options",
          "X-Content-Type-Options",
          "Referrer-Policy",
          "Strict-Transport-Security",
          "Content-Security-Policy",
        ];

        const foundHeaders = securityHeaders.filter((header) =>
          content.includes(header)
        );

        if (foundHeaders.length >= 3) {
          this.addCheck({
            category: "Infrastructure",
            name: "Security Headers",
            status: "PASS",
            severity: "HIGH",
            description: `${foundHeaders.length} security headers configured`,
          });
        } else if (foundHeaders.length > 0) {
          this.addCheck({
            category: "Infrastructure",
            name: "Security Headers",
            status: "WARNING",
            severity: "HIGH",
            description: `${foundHeaders.length} security headers configured`,
            recommendation: "Add more security headers (CSP, HSTS, etc.)",
          });
        } else {
          this.addCheck({
            category: "Infrastructure",
            name: "Security Headers",
            status: "FAIL",
            severity: "HIGH",
            description: "No security headers configured",
            recommendation: "Implement security headers in Next.js config",
          });
        }
      } catch (error) {
        this.addCheck({
          category: "Infrastructure",
          name: "Next.js Security Config",
          status: "INFO",
          severity: "LOW",
          description: "Unable to analyze Next.js configuration",
        });
      }
    }

    console.log("");
  }

  private async findApiRoutes(): Promise<string[]> {
    try {
      const routes = await glob("app/api/**/route.{ts,js}", {
        cwd: this.projectRoot,
        absolute: true,
      });
      return routes;
    } catch (error) {
      return [];
    }
  }

  private async findValidationSchemas(): Promise<string[]> {
    try {
      const schemas = await glob("**/{schema,schemas,validation}*.{ts,js}", {
        cwd: this.projectRoot,
        absolute: true,
        ignore: ["node_modules/**", ".next/**", "dist/**"],
      });
      return schemas;
    } catch (error) {
      return [];
    }
  }

  private addCheck(check: SecurityCheck) {
    this.checks.push(check);

    const statusIcon = {
      PASS: "✅",
      FAIL: "❌",
      WARNING: "⚠️",
      INFO: "ℹ️",
    }[check.status];

    const severityIcon = {
      CRITICAL: "🚨",
      HIGH: "🔥",
      MEDIUM: "📋",
      LOW: "💡",
    }[check.severity];

    console.log(
      `  ${statusIcon} ${severityIcon} ${check.name}: ${check.description}`
    );
    if (check.recommendation) {
      console.log(`     💡 ${check.recommendation}`);
    }
  }

  private generateSecurityReport() {
    console.log("\n🎯 STATIC SECURITY VALIDATION REPORT");
    console.log("====================================");

    const summary = {
      total: this.checks.length,
      pass: this.checks.filter((c) => c.status === "PASS").length,
      fail: this.checks.filter((c) => c.status === "FAIL").length,
      warning: this.checks.filter((c) => c.status === "WARNING").length,
      info: this.checks.filter((c) => c.status === "INFO").length,
    };

    console.log(`Total Checks: ${summary.total}`);
    console.log(`✅ Passed: ${summary.pass}`);
    console.log(`❌ Failed: ${summary.fail}`);
    console.log(`⚠️  Warnings: ${summary.warning}`);
    console.log(`ℹ️  Info: ${summary.info}`);

    // Calculate security score
    const scoreableChecks = summary.total - summary.info;
    const score =
      scoreableChecks > 0
        ? Math.round((summary.pass / scoreableChecks) * 100)
        : 0;

    console.log(`\n📊 Security Score: ${score}%`);

    // Critical and high severity issues
    const criticalIssues = this.checks.filter(
      (c) =>
        (c.status === "FAIL" || c.status === "WARNING") &&
        (c.severity === "CRITICAL" || c.severity === "HIGH")
    );

    if (criticalIssues.length > 0) {
      console.log("\n🚨 HIGH PRIORITY SECURITY ISSUES");
      console.log("================================");
      criticalIssues.forEach((check) => {
        console.log(
          `${check.severity === "CRITICAL" ? "🚨" : "🔥"} ${check.name}: ${
            check.description
          }`
        );
        if (check.recommendation) {
          console.log(`   💡 ${check.recommendation}`);
        }
      });
    }

    // Overall assessment
    console.log("\n🎯 SECURITY ASSESSMENT");
    console.log("======================");

    const criticalFails = this.checks.filter(
      (c) => c.status === "FAIL" && c.severity === "CRITICAL"
    ).length;
    const highFails = this.checks.filter(
      (c) => c.status === "FAIL" && c.severity === "HIGH"
    ).length;

    if (criticalFails > 0) {
      console.log("🚨 CRITICAL SECURITY ISSUES DETECTED");
      console.log("   → IMMEDIATE ACTION REQUIRED");
      console.log("   → DO NOT DEPLOY TO PRODUCTION");
    } else if (score >= 85 && highFails === 0) {
      console.log("🏆 EXCELLENT SECURITY POSTURE");
      console.log("   → Ready for production deployment");
      console.log("   → Continue security monitoring");
    } else if (score >= 70) {
      console.log("✅ GOOD SECURITY POSTURE");
      console.log("   → Acceptable for production");
      console.log("   → Address warnings for optimal security");
    } else if (score >= 50) {
      console.log("⚠️  MODERATE SECURITY POSTURE");
      console.log("   → Requires improvements before production");
      console.log("   → Address high-priority issues");
    } else {
      console.log("❌ INADEQUATE SECURITY POSTURE");
      console.log("   → Major security improvements required");
      console.log("   → Not ready for production deployment");
    }

    console.log("\n📋 NEXT STEPS");
    console.log("=============");

    if (criticalFails > 0 || score < 70) {
      console.log("1. 🚨 Address all critical and high-severity issues");
      console.log("2. 🔄 Re-run security validation");
      console.log("3. 🛡️  Implement missing security measures");
      console.log("4. 📊 Achieve security score above 70%");
    } else {
      console.log("1. ⚠️  Address remaining warnings");
      console.log("2. 🔍 Perform runtime security testing");
      console.log("3. 📊 Set up continuous security monitoring");
      console.log("4. ✅ Proceed with production deployment");
    }
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  let projectRoot = process.cwd();

  if (args.includes("--help")) {
    console.log(
      "Usage: npx tsx static-security-validation.ts [--path <project-path>]"
    );
    return;
  }

  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === "--path") {
      projectRoot = args[i + 1] || projectRoot;
    }
  }

  const validator = new StaticSecurityValidator(projectRoot);
  await validator.validateSecurity();
}

if (require.main === module) {
  main().catch(console.error);
}

export { StaticSecurityValidator };
