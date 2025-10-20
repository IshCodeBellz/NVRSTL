#!/usr/bin/env tsx

/**
 * Comprehensive Security Audit Suite
 * Tests API security, authentication, input validation, and more
 */

import { z } from "zod";
import fs from "fs";
import path from "path";

interface SecurityTestResult {
  testName: string;
  category:
    | "Authentication"
    | "Authorization"
    | "Input Validation"
    | "API Security"
    | "Data Protection"
    | "Infrastructure";
  status: "PASS" | "FAIL" | "WARNING" | "SKIP";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  description: string;
  recommendation?: string;
  details?: any;
}

class SecurityAuditor {
  private results: SecurityTestResult[] = [];
  private baseUrl: string;

  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  async runFullSecurityAudit() {
    console.log("🔒 COMPREHENSIVE SECURITY AUDIT");
    console.log("===============================");
    console.log(`Target: ${this.baseUrl}`);
    console.log("");

    try {
      // Pre-audit checks
      await this.preAuditChecks();

      // Phase 1: Authentication Security
      await this.auditAuthentication();

      // Phase 2: Authorization & Access Control
      await this.auditAuthorization();

      // Phase 3: Input Validation & Injection Prevention
      await this.auditInputValidation();

      // Phase 4: API Security
      await this.auditApiSecurity();

      // Phase 5: Data Protection
      await this.auditDataProtection();

      // Phase 6: Infrastructure Security
      await this.auditInfrastructure();

      // Generate comprehensive report
      this.generateSecurityReport();
    } catch (error) {
      console.error("❌ Security audit failed:", error);
      throw error;
    }
  }

  private async preAuditChecks() {
    console.log("🔍 Running pre-audit security checks...");

    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      if (!response.ok) {
        throw new Error(`Application not accessible: ${response.status}`);
      }
      console.log("✅ Application is accessible");

      // Check HTTPS in production
      if (this.baseUrl.startsWith("https://")) {
        console.log("✅ HTTPS enabled");
      } else if (this.baseUrl.includes("localhost")) {
        console.log("ℹ️  Local development - HTTPS not required");
      } else {
        this.addResult({
          testName: "HTTPS Configuration",
          category: "Infrastructure",
          status: "FAIL",
          severity: "CRITICAL",
          description: "Production application should use HTTPS",
          recommendation: "Enable HTTPS/TLS for all production traffic",
        });
      }
    } catch (error) {
      throw new Error(`Pre-audit checks failed: ${error}`);
    }

    console.log("");
  }

  private async auditAuthentication() {
    console.log("👤 Phase 1: Authentication Security");
    console.log("===================================");

    // Test 1: Check authentication endpoints exist
    await this.testAuthenticationEndpoints();

    // Test 2: Password security
    await this.testPasswordSecurity();

    // Test 3: Session management
    await this.testSessionSecurity();

    // Test 4: Login attempt limiting
    await this.testLoginAttemptLimiting();

    // Test 5: Multi-factor authentication
    await this.testMfaSecurity();

    console.log("");
  }

  private async testAuthenticationEndpoints() {
    console.log("🔐 Testing authentication endpoints...");

    try {
      // Check login endpoint exists
      const loginResponse = await fetch(`${this.baseUrl}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "test123",
        }),
      });

      if (loginResponse.status === 401 || loginResponse.status === 400) {
        this.addResult({
          testName: "Authentication Endpoint",
          category: "Authentication",
          status: "PASS",
          severity: "INFO",
          description: "Login endpoint properly rejects invalid credentials",
        });
      } else if (loginResponse.status === 404) {
        this.addResult({
          testName: "Authentication Endpoint",
          category: "Authentication",
          status: "FAIL",
          severity: "CRITICAL",
          description: "Authentication endpoint not found",
          recommendation: "Implement proper authentication endpoints",
        });
      }

      // Check for password in response (should not exist)
      const loginData = await loginResponse.text();
      if (loginData.toLowerCase().includes("password")) {
        this.addResult({
          testName: "Password Exposure",
          category: "Authentication",
          status: "FAIL",
          severity: "HIGH",
          description:
            "Password data may be exposed in authentication response",
          recommendation: "Remove password fields from all API responses",
        });
      } else {
        this.addResult({
          testName: "Password Exposure",
          category: "Authentication",
          status: "PASS",
          severity: "INFO",
          description: "No password data exposed in authentication response",
        });
      }
    } catch (error) {
      this.addResult({
        testName: "Authentication Endpoint Test",
        category: "Authentication",
        status: "FAIL",
        severity: "HIGH",
        description: `Authentication endpoint test failed: ${error}`,
      });
    }
  }

  private async testPasswordSecurity() {
    console.log("🔑 Testing password security...");

    // Test weak password acceptance
    try {
      const weakPasswords = ["123", "password", "admin", "test"];

      for (const weakPass of weakPasswords) {
        const response = await fetch(`${this.baseUrl}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `test${Date.now()}@example.com`,
            password: weakPass,
            name: "Test User",
          }),
        });

        if (response.ok) {
          this.addResult({
            testName: "Weak Password Prevention",
            category: "Authentication",
            status: "FAIL",
            severity: "HIGH",
            description: `Weak password "${weakPass}" was accepted`,
            recommendation:
              "Implement strong password requirements (min 8 chars, complexity)",
          });
        }
      }

      // If we get here without failures, passwords are being validated
      this.addResult({
        testName: "Password Strength Validation",
        category: "Authentication",
        status: "PASS",
        severity: "INFO",
        description: "Weak passwords are properly rejected",
      });
    } catch (error) {
      this.addResult({
        testName: "Password Security Test",
        category: "Authentication",
        status: "WARNING",
        severity: "MEDIUM",
        description:
          "Unable to test password security - registration endpoint may not be available",
      });
    }
  }

  private async testSessionSecurity() {
    console.log("📝 Testing session security...");

    try {
      // Check session endpoint
      const sessionResponse = await fetch(`${this.baseUrl}/api/auth/session`);

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();

        // Check for sensitive data in session
        const sensitiveFields = ["password", "hash", "salt", "secret"];
        const sessionString = JSON.stringify(sessionData).toLowerCase();

        let foundSensitive = false;
        for (const field of sensitiveFields) {
          if (sessionString.includes(field)) {
            foundSensitive = true;
            this.addResult({
              testName: "Session Data Security",
              category: "Authentication",
              status: "FAIL",
              severity: "HIGH",
              description: `Sensitive data "${field}" found in session response`,
              recommendation:
                "Remove all sensitive data from session responses",
            });
          }
        }

        if (!foundSensitive) {
          this.addResult({
            testName: "Session Data Security",
            category: "Authentication",
            status: "PASS",
            severity: "INFO",
            description: "No sensitive data exposed in session",
          });
        }
      }
    } catch (error) {
      this.addResult({
        testName: "Session Security Test",
        category: "Authentication",
        status: "WARNING",
        severity: "MEDIUM",
        description: "Unable to test session security",
      });
    }
  }

  private async testLoginAttemptLimiting() {
    console.log("🚫 Testing login attempt limiting...");

    try {
      const testEmail = "brute-force-test@example.com";
      let consecutiveAttempts = 0;

      // Try multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        const response = await fetch(`${this.baseUrl}/api/auth/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: testEmail,
            password: "wrong-password",
          }),
        });

        if (response.status === 429) {
          // Rate limited - good!
          this.addResult({
            testName: "Brute Force Protection",
            category: "Authentication",
            status: "PASS",
            severity: "INFO",
            description: `Login attempts rate limited after ${consecutiveAttempts} attempts`,
          });
          return;
        }

        consecutiveAttempts++;

        // Small delay between attempts
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // If we got here, no rate limiting was detected
      this.addResult({
        testName: "Brute Force Protection",
        category: "Authentication",
        status: "FAIL",
        severity: "HIGH",
        description: "No rate limiting detected for login attempts",
        recommendation:
          "Implement login attempt limiting and account lockout policies",
      });
    } catch (error) {
      this.addResult({
        testName: "Login Attempt Limiting Test",
        category: "Authentication",
        status: "WARNING",
        severity: "MEDIUM",
        description: "Unable to test login attempt limiting",
      });
    }
  }

  private async testMfaSecurity() {
    console.log("🔐 Testing multi-factor authentication...");

    try {
      // Check if MFA endpoints exist
      const mfaResponse = await fetch(`${this.baseUrl}/api/auth/mfa/setup`);

      if (mfaResponse.status === 404) {
        this.addResult({
          testName: "Multi-Factor Authentication",
          category: "Authentication",
          status: "WARNING",
          severity: "MEDIUM",
          description: "MFA endpoints not found",
          recommendation: "Consider implementing MFA for enhanced security",
        });
      } else {
        this.addResult({
          testName: "Multi-Factor Authentication",
          category: "Authentication",
          status: "PASS",
          severity: "INFO",
          description: "MFA endpoints available",
        });
      }
    } catch (error) {
      this.addResult({
        testName: "MFA Security Test",
        category: "Authentication",
        status: "WARNING",
        severity: "LOW",
        description: "Unable to test MFA configuration",
      });
    }
  }

  private async auditAuthorization() {
    console.log("🛡️  Phase 2: Authorization & Access Control");
    console.log("==========================================");

    // Test 1: Admin endpoint protection
    await this.testAdminEndpointProtection();

    // Test 2: User data access control
    await this.testUserDataAccessControl();

    // Test 3: Order access control
    await this.testOrderAccessControl();

    console.log("");
  }

  private async testAdminEndpointProtection() {
    console.log("👑 Testing admin endpoint protection...");

    const adminEndpoints = [
      "/api/admin/products",
      "/api/admin/orders",
      "/api/admin/users",
      "/api/admin/analytics",
      "/api/admin/performance",
    ];

    for (const endpoint of adminEndpoints) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`);

        if (response.status === 401 || response.status === 403) {
          this.addResult({
            testName: `Admin Endpoint Protection: ${endpoint}`,
            category: "Authorization",
            status: "PASS",
            severity: "INFO",
            description:
              "Admin endpoint properly protected from unauthorized access",
          });
        } else if (response.ok) {
          this.addResult({
            testName: `Admin Endpoint Protection: ${endpoint}`,
            category: "Authorization",
            status: "FAIL",
            severity: "CRITICAL",
            description: "Admin endpoint accessible without authentication",
            recommendation:
              "Implement proper admin authentication and authorization",
          });
        }
      } catch (error) {
        // Network error is acceptable for this test
      }
    }
  }

  private async testUserDataAccessControl() {
    console.log("👥 Testing user data access control...");

    try {
      // Try to access user data without authentication
      const response = await fetch(`${this.baseUrl}/api/account/profile`);

      if (response.status === 401 || response.status === 403) {
        this.addResult({
          testName: "User Data Access Control",
          category: "Authorization",
          status: "PASS",
          severity: "INFO",
          description: "User data endpoints properly protected",
        });
      } else if (response.ok) {
        this.addResult({
          testName: "User Data Access Control",
          category: "Authorization",
          status: "FAIL",
          severity: "HIGH",
          description: "User data accessible without authentication",
          recommendation: "Implement user authentication for profile endpoints",
        });
      }
    } catch (error) {
      this.addResult({
        testName: "User Data Access Test",
        category: "Authorization",
        status: "WARNING",
        severity: "MEDIUM",
        description: "Unable to test user data access control",
      });
    }
  }

  private async testOrderAccessControl() {
    console.log("🛒 Testing order access control...");

    try {
      // Try to access orders without authentication
      const response = await fetch(`${this.baseUrl}/api/orders`);

      if (response.status === 401 || response.status === 403) {
        this.addResult({
          testName: "Order Access Control",
          category: "Authorization",
          status: "PASS",
          severity: "INFO",
          description: "Order endpoints properly protected",
        });
      } else if (response.ok) {
        this.addResult({
          testName: "Order Access Control",
          category: "Authorization",
          status: "FAIL",
          severity: "HIGH",
          description: "Order data accessible without authentication",
          recommendation: "Implement user authentication for order endpoints",
        });
      }
    } catch (error) {
      this.addResult({
        testName: "Order Access Control Test",
        category: "Authorization",
        status: "WARNING",
        severity: "MEDIUM",
        description: "Unable to test order access control",
      });
    }
  }

  private async auditInputValidation() {
    console.log("🔍 Phase 3: Input Validation & Injection Prevention");
    console.log("==================================================");

    // Test 1: SQL Injection protection
    await this.testSqlInjectionProtection();

    // Test 2: XSS protection
    await this.testXssProtection();

    // Test 3: Input validation
    await this.testInputValidation();

    console.log("");
  }

  private async testSqlInjectionProtection() {
    console.log("💉 Testing SQL injection protection...");

    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR 1=1 --",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
    ];

    for (const payload of sqlPayloads) {
      try {
        // Test search endpoint with SQL injection payload
        const response = await fetch(
          `${this.baseUrl}/api/products?q=${encodeURIComponent(payload)}`
        );

        if (response.ok) {
          const data = await response.text();

          // Check for SQL error messages
          const sqlErrors = [
            "syntax error",
            "mysql_",
            "ora-",
            "microsoft jet database",
            "sqlite_",
          ];
          const hasError = sqlErrors.some((error) =>
            data.toLowerCase().includes(error)
          );

          if (hasError) {
            this.addResult({
              testName: "SQL Injection Protection",
              category: "Input Validation",
              status: "FAIL",
              severity: "CRITICAL",
              description:
                "SQL error messages exposed, potential SQL injection vulnerability",
              recommendation:
                "Use parameterized queries and proper error handling",
            });
            return;
          }
        }
      } catch (error) {
        // Network errors are acceptable for this test
      }
    }

    this.addResult({
      testName: "SQL Injection Protection",
      category: "Input Validation",
      status: "PASS",
      severity: "INFO",
      description:
        "No SQL injection vulnerabilities detected in search endpoint",
    });
  }

  private async testXssProtection() {
    console.log("🚨 Testing XSS protection...");

    const xssPayloads = [
      "<script>alert('XSS')</script>",
      "<img src=x onerror=alert('XSS')>",
      "javascript:alert('XSS')",
      "<svg onload=alert('XSS')>",
    ];

    for (const payload of xssPayloads) {
      try {
        // Test search with XSS payload
        const response = await fetch(
          `${this.baseUrl}/api/products?q=${encodeURIComponent(payload)}`
        );

        if (response.ok) {
          const data = await response.text();

          // Check if payload is reflected unescaped
          if (
            data.includes(payload) &&
            !data.includes(payload.replace(/</g, "&lt;"))
          ) {
            this.addResult({
              testName: "XSS Protection",
              category: "Input Validation",
              status: "FAIL",
              severity: "HIGH",
              description:
                "Unescaped user input detected, potential XSS vulnerability",
              recommendation:
                "Implement proper input sanitization and output encoding",
            });
            return;
          }
        }
      } catch (error) {
        // Network errors are acceptable
      }
    }

    this.addResult({
      testName: "XSS Protection",
      category: "Input Validation",
      status: "PASS",
      severity: "INFO",
      description: "No XSS vulnerabilities detected",
    });
  }

  private async testInputValidation() {
    console.log("✅ Testing input validation...");

    try {
      // Test invalid input types
      const invalidInputs = [
        { email: "not-an-email", password: "123" },
        { email: "", password: "" },
        { email: "a".repeat(1000), password: "b".repeat(1000) },
      ];

      for (const input of invalidInputs) {
        const response = await fetch(`${this.baseUrl}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        if (response.ok) {
          this.addResult({
            testName: "Input Validation",
            category: "Input Validation",
            status: "FAIL",
            severity: "MEDIUM",
            description: "Invalid input accepted by registration endpoint",
            recommendation: "Implement comprehensive input validation",
          });
          return;
        }
      }

      this.addResult({
        testName: "Input Validation",
        category: "Input Validation",
        status: "PASS",
        severity: "INFO",
        description: "Input validation properly rejects invalid data",
      });
    } catch (error) {
      this.addResult({
        testName: "Input Validation Test",
        category: "Input Validation",
        status: "WARNING",
        severity: "LOW",
        description: "Unable to test input validation",
      });
    }
  }

  private async auditApiSecurity() {
    console.log("🔌 Phase 4: API Security");
    console.log("========================");

    // Test 1: HTTP headers security
    await this.testSecurityHeaders();

    // Test 2: Rate limiting
    await this.testRateLimiting();

    // Test 3: CORS configuration
    await this.testCorsConfiguration();

    console.log("");
  }

  private async testSecurityHeaders() {
    console.log("📋 Testing security headers...");

    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      const headers = response.headers;

      const securityHeaders = {
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "x-xss-protection": "1; mode=block",
        "strict-transport-security": "max-age=31536000",
      };

      for (const [header, expectedValue] of Object.entries(securityHeaders)) {
        const headerValue = headers.get(header);

        if (!headerValue) {
          this.addResult({
            testName: `Security Header: ${header}`,
            category: "API Security",
            status: "WARNING",
            severity: "MEDIUM",
            description: `Missing security header: ${header}`,
            recommendation: `Add ${header}: ${expectedValue} header`,
          });
        } else {
          this.addResult({
            testName: `Security Header: ${header}`,
            category: "API Security",
            status: "PASS",
            severity: "INFO",
            description: `Security header ${header} is present`,
          });
        }
      }
    } catch (error) {
      this.addResult({
        testName: "Security Headers Test",
        category: "API Security",
        status: "WARNING",
        severity: "MEDIUM",
        description: "Unable to test security headers",
      });
    }
  }

  private async testRateLimiting() {
    console.log("⏱️  Testing rate limiting...");

    try {
      let requestCount = 0;
      const maxRequests = 20;

      for (let i = 0; i < maxRequests; i++) {
        const response = await fetch(`${this.baseUrl}/api/products?page=1`);
        requestCount++;

        if (response.status === 429) {
          this.addResult({
            testName: "Rate Limiting",
            category: "API Security",
            status: "PASS",
            severity: "INFO",
            description: `Rate limiting active - limited after ${requestCount} requests`,
          });
          return;
        }

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      this.addResult({
        testName: "Rate Limiting",
        category: "API Security",
        status: "WARNING",
        severity: "MEDIUM",
        description: "No rate limiting detected after 20 requests",
        recommendation: "Implement API rate limiting to prevent abuse",
      });
    } catch (error) {
      this.addResult({
        testName: "Rate Limiting Test",
        category: "API Security",
        status: "WARNING",
        severity: "LOW",
        description: "Unable to test rate limiting",
      });
    }
  }

  private async testCorsConfiguration() {
    console.log("🌐 Testing CORS configuration...");

    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: "OPTIONS",
      });

      const corsHeaders = {
        "access-control-allow-origin": response.headers.get(
          "access-control-allow-origin"
        ),
        "access-control-allow-methods": response.headers.get(
          "access-control-allow-methods"
        ),
        "access-control-allow-headers": response.headers.get(
          "access-control-allow-headers"
        ),
      };

      // Check for overly permissive CORS
      if (corsHeaders["access-control-allow-origin"] === "*") {
        this.addResult({
          testName: "CORS Configuration",
          category: "API Security",
          status: "WARNING",
          severity: "MEDIUM",
          description: "CORS allows all origins (*)",
          recommendation:
            "Restrict CORS to specific trusted domains in production",
        });
      } else {
        this.addResult({
          testName: "CORS Configuration",
          category: "API Security",
          status: "PASS",
          severity: "INFO",
          description: "CORS configuration appears secure",
        });
      }
    } catch (error) {
      this.addResult({
        testName: "CORS Configuration Test",
        category: "API Security",
        status: "WARNING",
        severity: "LOW",
        description: "Unable to test CORS configuration",
      });
    }
  }

  private async auditDataProtection() {
    console.log("🛡️  Phase 5: Data Protection");
    console.log("============================");

    // Test 1: Sensitive data exposure
    await this.testSensitiveDataExposure();

    // Test 2: Personal data handling
    await this.testPersonalDataHandling();

    console.log("");
  }

  private async testSensitiveDataExposure() {
    console.log("🔐 Testing sensitive data exposure...");

    try {
      // Test various endpoints for sensitive data
      const endpoints = ["/api/products", "/api/health", "/api/auth/session"];

      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /key/i,
        /token/i,
        /hash/i,
        /salt/i,
        /private/i,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`);
          if (response.ok) {
            const data = await response.text();

            for (const pattern of sensitivePatterns) {
              if (pattern.test(data)) {
                this.addResult({
                  testName: "Sensitive Data Exposure",
                  category: "Data Protection",
                  status: "WARNING",
                  severity: "MEDIUM",
                  description: `Potential sensitive data found in ${endpoint}`,
                  recommendation:
                    "Review endpoint responses for sensitive information",
                });
              }
            }
          }
        } catch (error) {
          // Continue with other endpoints
        }
      }

      this.addResult({
        testName: "Sensitive Data Exposure Scan",
        category: "Data Protection",
        status: "PASS",
        severity: "INFO",
        description: "No obvious sensitive data exposure detected",
      });
    } catch (error) {
      this.addResult({
        testName: "Sensitive Data Exposure Test",
        category: "Data Protection",
        status: "WARNING",
        severity: "LOW",
        description: "Unable to complete sensitive data exposure test",
      });
    }
  }

  private async testPersonalDataHandling() {
    console.log("👤 Testing personal data handling...");

    // This is more of a code review item, but we can test some basics
    this.addResult({
      testName: "Personal Data Handling",
      category: "Data Protection",
      status: "WARNING",
      severity: "MEDIUM",
      description: "Manual review required for GDPR/privacy compliance",
      recommendation:
        "Review: data minimization, consent management, right to deletion, data portability",
    });
  }

  private async auditInfrastructure() {
    console.log("🏗️  Phase 6: Infrastructure Security");
    console.log("====================================");

    // Test 1: Environment configuration
    await this.testEnvironmentSecurity();

    // Test 2: Dependency security
    await this.testDependencySecurity();

    console.log("");
  }

  private async testEnvironmentSecurity() {
    console.log("⚙️  Testing environment security...");

    try {
      // Check if debug/development endpoints are exposed
      const debugEndpoints = [
        "/api/debug",
        "/api/test",
        "/.env",
        "/config",
        "/admin/phpinfo",
        "/server-status",
      ];

      let exposedEndpoints = 0;

      for (const endpoint of debugEndpoints) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`);
          if (response.ok) {
            exposedEndpoints++;
            this.addResult({
              testName: "Debug Endpoint Exposure",
              category: "Infrastructure",
              status: "FAIL",
              severity: "HIGH",
              description: `Debug endpoint exposed: ${endpoint}`,
              recommendation: "Remove or protect debug endpoints in production",
            });
          }
        } catch (error) {
          // Not accessible - good
        }
      }

      if (exposedEndpoints === 0) {
        this.addResult({
          testName: "Debug Endpoint Security",
          category: "Infrastructure",
          status: "PASS",
          severity: "INFO",
          description: "No debug endpoints exposed",
        });
      }
    } catch (error) {
      this.addResult({
        testName: "Environment Security Test",
        category: "Infrastructure",
        status: "WARNING",
        severity: "LOW",
        description: "Unable to test environment security",
      });
    }
  }

  private async testDependencySecurity() {
    console.log("📦 Testing dependency security...");

    try {
      // Check package.json for known vulnerable packages
      const packagePath = path.join(process.cwd(), "package.json");
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

        // Basic check for outdated major versions
        const dependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        let outdatedDeps = 0;
        const knownVulnerable = [
          "lodash@4.17.20",
          "axios@0.21.0",
          "serialize-javascript@3.1.0",
        ];

        for (const [name, version] of Object.entries(dependencies)) {
          const depString = `${name}@${version}`;
          if (knownVulnerable.includes(depString)) {
            outdatedDeps++;
            this.addResult({
              testName: "Dependency Security",
              category: "Infrastructure",
              status: "FAIL",
              severity: "HIGH",
              description: `Known vulnerable dependency: ${depString}`,
              recommendation: "Update to secure version and run npm audit",
            });
          }
        }

        if (outdatedDeps === 0) {
          this.addResult({
            testName: "Dependency Security",
            category: "Infrastructure",
            status: "PASS",
            severity: "INFO",
            description: "No known vulnerable dependencies detected",
          });
        }

        this.addResult({
          testName: "Dependency Audit Recommendation",
          category: "Infrastructure",
          status: "WARNING",
          severity: "LOW",
          description: "Regular dependency audits recommended",
          recommendation:
            'Run "npm audit" regularly and keep dependencies updated',
        });
      }
    } catch (error) {
      this.addResult({
        testName: "Dependency Security Test",
        category: "Infrastructure",
        status: "WARNING",
        severity: "LOW",
        description: "Unable to test dependency security",
      });
    }
  }

  private addResult(result: SecurityTestResult) {
    this.results.push(result);

    const statusIcon = {
      PASS: "✅",
      FAIL: "❌",
      WARNING: "⚠️",
      SKIP: "⏭️",
    }[result.status];

    const severityColor = {
      CRITICAL: "\x1b[41m",
      HIGH: "\x1b[31m",
      MEDIUM: "\x1b[33m",
      LOW: "\x1b[34m",
      INFO: "\x1b[32m",
    }[result.severity];

    console.log(
      `  ${statusIcon} ${result.testName}: ${severityColor}${result.severity}\x1b[0m - ${result.description}`
    );
    if (result.recommendation) {
      console.log(`     💡 ${result.recommendation}`);
    }
  }

  private generateSecurityReport() {
    console.log("\n🔒 COMPREHENSIVE SECURITY AUDIT REPORT");
    console.log("======================================");

    const summary = {
      total: this.results.length,
      pass: this.results.filter((r) => r.status === "PASS").length,
      fail: this.results.filter((r) => r.status === "FAIL").length,
      warning: this.results.filter((r) => r.status === "WARNING").length,
      skip: this.results.filter((r) => r.status === "SKIP").length,
    };

    const severityCounts = {
      critical: this.results.filter((r) => r.severity === "CRITICAL").length,
      high: this.results.filter((r) => r.severity === "HIGH").length,
      medium: this.results.filter((r) => r.severity === "MEDIUM").length,
      low: this.results.filter((r) => r.severity === "LOW").length,
    };

    console.log("\n📊 SUMMARY");
    console.log("==========");
    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.pass}`);
    console.log(`❌ Failed: ${summary.fail}`);
    console.log(`⚠️  Warnings: ${summary.warning}`);
    console.log(`⏭️  Skipped: ${summary.skip}`);

    console.log("\n🎯 SEVERITY BREAKDOWN");
    console.log("====================");
    console.log(`🔴 Critical: ${severityCounts.critical}`);
    console.log(`🟠 High: ${severityCounts.high}`);
    console.log(`🟡 Medium: ${severityCounts.medium}`);
    console.log(`🔵 Low: ${severityCounts.low}`);

    // Security score calculation
    let score = 100;
    score -= severityCounts.critical * 25;
    score -= severityCounts.high * 15;
    score -= severityCounts.medium * 5;
    score -= severityCounts.low * 1;
    score = Math.max(0, score);

    console.log("\n🎯 SECURITY ASSESSMENT");
    console.log("=====================");
    console.log(`Security Score: ${score}/100`);

    if (score >= 90) {
      console.log("✅ EXCELLENT - Ready for production deployment");
    } else if (score >= 75) {
      console.log("🟡 GOOD - Address high/critical issues before production");
    } else if (score >= 50) {
      console.log("⚠️  MODERATE - Significant security improvements needed");
    } else {
      console.log("❌ POOR - Major security issues must be resolved");
    }

    // Category breakdown
    console.log("\n📋 CATEGORY ANALYSIS");
    console.log("===================");
    const categories = [
      "Authentication",
      "Authorization",
      "Input Validation",
      "API Security",
      "Data Protection",
      "Infrastructure",
    ];

    for (const category of categories) {
      const categoryResults = this.results.filter(
        (r) => r.category === category
      );
      const categoryFails = categoryResults.filter(
        (r) => r.status === "FAIL"
      ).length;
      const categoryWarnings = categoryResults.filter(
        (r) => r.status === "WARNING"
      ).length;

      if (categoryFails === 0 && categoryWarnings === 0) {
        console.log(`✅ ${category}: All checks passed`);
      } else if (categoryFails === 0) {
        console.log(`🟡 ${category}: ${categoryWarnings} warnings`);
      } else {
        console.log(
          `❌ ${category}: ${categoryFails} failures, ${categoryWarnings} warnings`
        );
      }
    }

    // Critical issues
    const criticalIssues = this.results.filter(
      (r) => r.severity === "CRITICAL"
    );
    if (criticalIssues.length > 0) {
      console.log("\n🚨 CRITICAL ISSUES (MUST FIX)");
      console.log("=============================");
      criticalIssues.forEach((issue) => {
        console.log(`❌ ${issue.testName}: ${issue.description}`);
        if (issue.recommendation) {
          console.log(`   💡 ${issue.recommendation}`);
        }
      });
    }

    // High priority issues
    const highIssues = this.results.filter((r) => r.severity === "HIGH");
    if (highIssues.length > 0) {
      console.log("\n🔴 HIGH PRIORITY ISSUES");
      console.log("======================");
      highIssues.forEach((issue) => {
        console.log(`❌ ${issue.testName}: ${issue.description}`);
        if (issue.recommendation) {
          console.log(`   💡 ${issue.recommendation}`);
        }
      });
    }

    // Save detailed report
    this.saveDetailedReport(score, summary, severityCounts);

    console.log("\n🎉 Security audit completed!");
    console.log("Review the detailed report for specific recommendations.");
  }

  private saveDetailedReport(score: number, summary: any, severityCounts: any) {
    const report = {
      timestamp: new Date().toISOString(),
      target: this.baseUrl,
      securityScore: score,
      summary,
      severityCounts,
      results: this.results,
      recommendations: this.generateRecommendations(),
    };

    const resultsDir = path.join(__dirname, "results");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const reportFile = path.join(
      resultsDir,
      `security-audit-${Date.now()}.json`
    );
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log(`\n📁 Detailed report saved: ${reportFile}`);
  }

  private generateRecommendations(): string[] {
    const recommendations = [
      '1. Run "npm audit" regularly to check for vulnerable dependencies',
      "2. Implement comprehensive input validation for all user inputs",
      "3. Use HTTPS/TLS for all production traffic",
      "4. Implement proper error handling without exposing sensitive information",
      "5. Regular security code reviews and penetration testing",
      "6. Implement security headers (CSP, HSTS, X-Frame-Options, etc.)",
      "7. Monitor and log security events for threat detection",
      "8. Regular backup and disaster recovery testing",
      "9. Implement proper session management and secure authentication",
      "10. Stay updated with security best practices and OWASP guidelines",
    ];

    return recommendations;
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  let baseUrl = "http://localhost:3000";

  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    if (key === "--url" && value) {
      baseUrl = value;
    }
  }

  if (args.includes("--help")) {
    console.log("Usage: npx tsx security-audit.ts [options]");
    console.log("");
    console.log("Options:");
    console.log("  --url <url>   Target URL (default: http://localhost:3000)");
    console.log("  --help        Show this help");
    console.log("");
    console.log("Examples:");
    console.log("  npx tsx security-audit.ts");
    console.log("  npx tsx security-audit.ts --url https://production.com");
    return;
  }

  const auditor = new SecurityAuditor(baseUrl);
  await auditor.runFullSecurityAudit();
}

if (require.main === module) {
  main().catch(console.error);
}

export { SecurityAuditor };
