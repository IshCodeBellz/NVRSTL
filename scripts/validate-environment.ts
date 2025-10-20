#!/usr/bin/env node

import {
  validateProductionEnvironment,
  generateCarrierConfig,
  getShippingConfig,
} from "../lib/server/config/validateEnv.js";

async function runEnvironmentValidation() {
  console.log("🔍 DY Official - Production Environment Validation");
  console.log("=".repeat(60));

  const result = validateProductionEnvironment();

  // Display validation results
  if (result.isValid) {
    console.log("✅ Environment validation PASSED");
  } else {
    console.log("❌ Environment validation FAILED");
  }

  console.log("");

  // Show errors
  if (result.errors.length > 0) {
    console.log("🚨 ERRORS (must fix before production):");
    result.errors.forEach((error) => {
      console.log(`   ❌ ${error}`);
    });
    console.log("");
  }

  // Show warnings
  if (result.warnings.length > 0) {
    console.log("⚠️  WARNINGS (recommended to address):");
    result.warnings.forEach((warning) => {
      console.log(`   ⚠️  ${warning}`);
    });
    console.log("");
  }

  // Show recommendations
  if (result.recommendations.length > 0) {
    console.log("💡 RECOMMENDATIONS (for optimal setup):");
    result.recommendations.forEach((rec) => {
      console.log(`   💡 ${rec}`);
    });
    console.log("");
  }

  // Show configured carriers
  const carriers = generateCarrierConfig();
  console.log("📦 CONFIGURED CARRIERS:");
  if (carriers.length > 0) {
    carriers.forEach((carrier) => {
      console.log(`   ✅ ${carrier.name} (${carrier.environment})`);
      console.log(`      Webhook: ${carrier.webhookUrl}`);
    });
  } else {
    console.log("   ❌ No carriers configured");
  }
  console.log("");

  // Show shipping configuration
  const shippingConfig = getShippingConfig();
  console.log("⚙️  SHIPPING CONFIGURATION:");
  console.log(`   Default Carrier: ${shippingConfig.defaultCarrier}`);
  console.log(
    `   Free Shipping Threshold: £${(
      shippingConfig.freeShippingThreshold / 100
    ).toFixed(2)}`
  );
  console.log(
    `   Expedited Threshold: £${(
      shippingConfig.expeditedThreshold / 100
    ).toFixed(2)}`
  );
  console.log(
    `   Fulfillment Hours: ${shippingConfig.fulfillment.startHour}:00 - ${shippingConfig.fulfillment.endHour}:00 ${shippingConfig.fulfillment.timezone}`
  );
  console.log("");

  // Environment summary
  console.log("🌍 ENVIRONMENT SUMMARY:");
  console.log(`   Node Environment: ${process.env.NODE_ENV || "not set"}`);
  console.log(
    `   Database: ${
      process.env.DATABASE_URL ? "✅ Configured" : "❌ Not configured"
    }`
  );
  console.log(
    `   Redis: ${
      process.env.REDIS_URL ? "✅ Configured" : "⚠️  Not configured"
    }`
  );
  console.log(
    `   Sentry: ${
      process.env.SENTRY_DSN ? "✅ Configured" : "⚠️  Not configured"
    }`
  );
  console.log(
    `   Email Service: ${
      process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY
        ? "✅ Configured"
        : "❌ Not configured"
    }`
  );
  console.log(
    `   SMS Service: ${
      process.env.TWILIO_ACCOUNT_SID ? "✅ Configured" : "⚠️  Not configured"
    }`
  );
  console.log("");

  // Next steps
  console.log("🚀 NEXT STEPS:");
  if (!result.isValid) {
    console.log("   1. Fix all errors listed above");
    console.log("   2. Update your .env.production file");
    console.log("   3. Re-run this validation script");
  } else {
    console.log("   1. Deploy to production environment");
    console.log("   2. Test carrier integrations in sandbox mode");
    console.log("   3. Configure webhook endpoints with carriers");
    console.log("   4. Set up monitoring and alerts");
    console.log("   5. Conduct end-to-end testing");
  }

  console.log("");
  console.log("📚 For detailed setup instructions, see:");
  console.log("   ./docs/PRODUCTION_ENVIRONMENT_SETUP.md");

  // Exit with appropriate code
  process.exit(result.isValid ? 0 : 1);
}

// Handle async execution
runEnvironmentValidation().catch((error) => {
  console.error("❌ Validation script failed:", error);
  process.exit(1);
});
