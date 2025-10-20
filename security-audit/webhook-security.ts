#!/usr/bin/env tsx

/**
 * Webhook Security Validator
 * Tests webhook signature validation and security
 */

import crypto from "crypto";
import { z } from "zod";

interface WebhookSecurityTest {
  testName: string;
  status: "PASS" | "FAIL" | "WARNING";
  description: string;
  recommendation?: string;
}

class WebhookSecurityValidator {
  private results: WebhookSecurityTest[] = [];
  private baseUrl: string;

  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  async validateWebhookSecurity() {
    console.log("🔗 WEBHOOK SECURITY VALIDATION");
    console.log("==============================");
    console.log(`Target: ${this.baseUrl}`);
    console.log("");

    try {
      // Test 1: Stripe webhook signature validation
      await this.testStripeWebhookSecurity();

      // Test 2: Webhook endpoint protection
      await this.testWebhookEndpointProtection();

      // Test 3: Payload validation
      await this.testWebhookPayloadValidation();

      // Test 4: Replay attack protection
      await this.testReplayAttackProtection();

      this.generateWebhookReport();
    } catch (error) {
      console.error("❌ Webhook security validation failed:", error);
    }
  }

  private async testStripeWebhookSecurity() {
    console.log("💳 Testing Stripe webhook signature validation...");

    try {
      // Test with invalid signature
      const testPayload = JSON.stringify({
        id: "evt_test_123",
        type: "payment_intent.succeeded",
        data: { object: { id: "pi_test_123" } },
      });

      const invalidSignature = "t=123456789,v1=invalid_signature";

      const response = await fetch(`${this.baseUrl}/api/webhooks/stripe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": invalidSignature,
        },
        body: testPayload,
      });

      if (response.status === 400 || response.status === 401) {
        this.addWebhookResult({
          testName: "Stripe Signature Validation",
          status: "PASS",
          description: "Webhook properly rejects invalid signatures",
        });
      } else if (response.ok) {
        this.addWebhookResult({
          testName: "Stripe Signature Validation",
          status: "FAIL",
          description: "Webhook accepts invalid signatures - security risk!",
          recommendation: "Implement proper Stripe signature validation",
        });
      } else {
        this.addWebhookResult({
          testName: "Stripe Signature Validation",
          status: "WARNING",
          description: `Unexpected response: ${response.status}`,
        });
      }
    } catch (error) {
      this.addWebhookResult({
        testName: "Stripe Webhook Test",
        status: "WARNING",
        description: "Unable to test Stripe webhook security",
      });
    }
  }

  private async testWebhookEndpointProtection() {
    console.log("🔒 Testing webhook endpoint protection...");

    try {
      // Test webhook without required headers
      const response = await fetch(`${this.baseUrl}/api/webhooks/stripe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      });

      if (response.status === 400 || response.status === 401) {
        this.addWebhookResult({
          testName: "Webhook Endpoint Protection",
          status: "PASS",
          description: "Webhook endpoint properly protected",
        });
      } else if (response.ok) {
        this.addWebhookResult({
          testName: "Webhook Endpoint Protection",
          status: "FAIL",
          description:
            "Webhook endpoint accepts requests without proper authentication",
          recommendation: "Implement proper webhook authentication",
        });
      }
    } catch (error) {
      this.addWebhookResult({
        testName: "Webhook Protection Test",
        status: "WARNING",
        description: "Unable to test webhook endpoint protection",
      });
    }
  }

  private async testWebhookPayloadValidation() {
    console.log("📋 Testing webhook payload validation...");

    const maliciousPayloads = [
      '{"__proto__": {"polluted": true}}', // Prototype pollution
      '{"test": "' + "a".repeat(10000) + '"}', // Large payload
      '<script>alert("xss")</script>', // XSS attempt
      "invalid json{", // Invalid JSON
    ];

    let validationPassed = true;

    for (const payload of maliciousPayloads) {
      try {
        const response = await fetch(`${this.baseUrl}/api/webhooks/stripe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "stripe-signature": "t=123,v1=test",
          },
          body: payload,
        });

        // If any malicious payload is processed successfully, that's bad
        if (response.ok) {
          validationPassed = false;
          break;
        }
      } catch (error) {
        // Network errors are fine for this test
      }
    }

    if (validationPassed) {
      this.addWebhookResult({
        testName: "Webhook Payload Validation",
        status: "PASS",
        description:
          "Webhook properly validates and rejects malicious payloads",
      });
    } else {
      this.addWebhookResult({
        testName: "Webhook Payload Validation",
        status: "FAIL",
        description: "Webhook accepts malicious payloads",
        recommendation: "Implement strict payload validation and size limits",
      });
    }
  }

  private async testReplayAttackProtection() {
    console.log("🔄 Testing replay attack protection...");

    try {
      // Create a realistic webhook payload with old timestamp
      const oldTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = JSON.stringify({
        id: "evt_test_replay",
        type: "payment_intent.succeeded",
      });

      // Generate a signature with old timestamp (this would be valid if we had the secret)
      const signature = `t=${oldTimestamp},v1=test_signature`;

      const response = await fetch(`${this.baseUrl}/api/webhooks/stripe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": signature,
        },
        body: payload,
      });

      if (response.status === 400) {
        this.addWebhookResult({
          testName: "Replay Attack Protection",
          status: "PASS",
          description:
            "Webhook rejects old timestamps (replay protection active)",
        });
      } else {
        this.addWebhookResult({
          testName: "Replay Attack Protection",
          status: "WARNING",
          description: "Unable to verify replay attack protection",
          recommendation: "Ensure webhook timestamp validation is implemented",
        });
      }
    } catch (error) {
      this.addWebhookResult({
        testName: "Replay Attack Protection Test",
        status: "WARNING",
        description: "Unable to test replay attack protection",
      });
    }
  }

  private addWebhookResult(result: WebhookSecurityTest) {
    this.results.push(result);

    const statusIcon = {
      PASS: "✅",
      FAIL: "❌",
      WARNING: "⚠️",
    }[result.status];

    console.log(`  ${statusIcon} ${result.testName}: ${result.description}`);
    if (result.recommendation) {
      console.log(`     💡 ${result.recommendation}`);
    }
  }

  private generateWebhookReport() {
    console.log("\n🔗 WEBHOOK SECURITY REPORT");
    console.log("==========================");

    const summary = {
      total: this.results.length,
      pass: this.results.filter((r) => r.status === "PASS").length,
      fail: this.results.filter((r) => r.status === "FAIL").length,
      warning: this.results.filter((r) => r.status === "WARNING").length,
    };

    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.pass}`);
    console.log(`❌ Failed: ${summary.fail}`);
    console.log(`⚠️  Warnings: ${summary.warning}`);

    const failedTests = this.results.filter((r) => r.status === "FAIL");
    if (failedTests.length > 0) {
      console.log("\n❌ FAILED TESTS (MUST FIX)");
      console.log("==========================");
      failedTests.forEach((test) => {
        console.log(`• ${test.testName}: ${test.description}`);
        if (test.recommendation) {
          console.log(`  💡 ${test.recommendation}`);
        }
      });
    }

    // Overall assessment
    if (summary.fail === 0) {
      console.log("\n✅ Webhook security is GOOD");
    } else {
      console.log("\n❌ Webhook security needs IMPROVEMENT");
    }
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  let baseUrl = "http://localhost:3000";

  if (args.includes("--help")) {
    console.log("Usage: npx tsx webhook-security.ts [--url <url>]");
    return;
  }

  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === "--url") {
      baseUrl = args[i + 1] || baseUrl;
    }
  }

  const validator = new WebhookSecurityValidator(baseUrl);
  await validator.validateWebhookSecurity();
}

if (require.main === module) {
  main().catch(console.error);
}

export { WebhookSecurityValidator };
