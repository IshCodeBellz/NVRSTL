#!/usr/bin/env node
/**
 * Quick check script for MailerSend configuration status
 */

// Load environment variables from .env files
let envLoaded = false;
try {
  // Try to load dotenv if available
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { config } = require("dotenv");

  // Try multiple .env file locations and load them all (later files override earlier ones)
  // Load in order: .env (base), .env.production (production overrides), .env.local (local overrides)
  const envFiles = [".env", ".env.production", ".env.local"];
  const loadedFiles: string[] = [];

  for (const envFile of envFiles) {
    try {
      const result = config({ path: envFile, override: true });
      if (
        result &&
        !result.error &&
        Object.keys(result.parsed || {}).length > 0
      ) {
        envLoaded = true;
        loadedFiles.push(envFile);
      }
    } catch {
      // Continue to next file
    }
  }

  if (loadedFiles.length > 0) {
    console.log(`📄 Loaded environment from: ${loadedFiles.join(", ")}`);
  }

  if (!envLoaded) {
    // Try loading without specifying path (defaults to .env)
    try {
      const result = config();
      if (result && !result.error) {
        envLoaded = true;
        console.log("📄 Loaded environment from default .env file");
      }
    } catch {
      // Ignore
    }
  }
} catch {
  // dotenv package not available - user should use dotenv-cli or set env vars directly
}

if (!envLoaded) {
  console.log("⚠️  No .env files loaded");
  console.log(
    "   Tip: Use 'dotenv -e .env.local -- npx tsx scripts/check-mailersend-config.ts'"
  );
  console.log(
    "   Or set environment variables directly before running the script"
  );
  console.log("");
}

function checkMailerSendConfig() {
  console.log("=".repeat(60));
  console.log("MailerSend Configuration Check");
  console.log("=".repeat(60));
  console.log("");

  const mailersendApiKey = process.env.MAILERSEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const emailFromName = process.env.EMAIL_FROM_NAME;
  const nodeEnv = process.env.NODE_ENV;

  // Check API Key
  if (mailersendApiKey) {
    console.log("✅ MAILERSEND_API_KEY: Configured");
    console.log(
      `   Key preview: ${mailersendApiKey.substring(
        0,
        8
      )}...${mailersendApiKey.substring(mailersendApiKey.length - 4)}`
    );
  } else {
    console.log("❌ MAILERSEND_API_KEY: Not configured");
    console.log("   Set MAILERSEND_API_KEY environment variable");
  }

  console.log("");

  // Check EMAIL_FROM
  if (emailFrom) {
    console.log(`✅ EMAIL_FROM: ${emailFrom}`);
  } else {
    console.log(
      "⚠️  EMAIL_FROM: Not set (will use default: noreply@nvrstl.com)"
    );
  }

  console.log("");

  // Check EMAIL_FROM_NAME
  if (emailFromName) {
    console.log(`✅ EMAIL_FROM_NAME: ${emailFromName}`);
  } else {
    console.log("⚠️  EMAIL_FROM_NAME: Not set (will use default: NVRSTL)");
  }

  console.log("");

  // Check environment
  if (nodeEnv === "production") {
    console.log(`✅ NODE_ENV: ${nodeEnv} (Production mode)`);
  } else if (nodeEnv === "test" || nodeEnv === "development") {
    console.log(
      `⚠️  NODE_ENV: ${nodeEnv} (MailerSend will use ConsoleMailer fallback)`
    );
  } else {
    console.log(`⚠️  NODE_ENV: ${nodeEnv || "not set"}`);
  }

  console.log("");

  // Summary
  console.log("=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));

  if (mailersendApiKey && emailFrom) {
    console.log("✅ MailerSend is fully configured");
    console.log("   Emails will be sent via MailerSend in production");
  } else if (mailersendApiKey) {
    console.log("⚠️  MailerSend API key is set, but EMAIL_FROM is missing");
    console.log("   Configure EMAIL_FROM for proper email sending");
  } else {
    console.log("❌ MailerSend is not configured");
    console.log("   Required:");
    console.log("   1. Set MAILERSEND_API_KEY environment variable");
    console.log("   2. Set EMAIL_FROM environment variable (verified domain)");
    console.log("   3. Optionally set EMAIL_FROM_NAME for display name");
    console.log("");
    console.log(
      "   In test/dev: Emails will use ConsoleMailer (logged to console)"
    );
  }

  console.log("");

  // Check for conflicting providers
  if (process.env.RESEND_API_KEY) {
    console.log("⚠️  RESEND_API_KEY is also set (MailerSend takes precedence)");
  }
  if (process.env.SENDGRID_API_KEY) {
    console.log(
      "⚠️  SENDGRID_API_KEY is also set (MailerSend takes precedence)"
    );
  }

  console.log("");
}

checkMailerSendConfig();
