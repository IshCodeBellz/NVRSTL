#!/usr/bin/env node

/**
 * Production Environment Configuration Wizard
 *
 * Interactive script to help configure production environment variables
 * Usage: node scripts/configure-production.js
 */

const readline = require("readline");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

class ProductionConfigWizard {
  constructor() {
    this.config = {};
    this.templatePath = path.join(__dirname, "..", ".env.production.template");
    this.outputPath = path.join(__dirname, "..", ".env.production");
  }

  async question(prompt) {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  }

  generateSecureKey(length = 32) {
    return crypto.randomBytes(length).toString("hex");
  }

  async run() {
    console.log("🚀 DY Official - Production Environment Configuration Wizard");
    console.log("=".repeat(60));
    console.log("");

    try {
      // Check if production env already exists
      if (fs.existsSync(this.outputPath)) {
        const overwrite = await this.question(
          "⚠️  .env.production already exists. Overwrite? (y/N): "
        );
        if (overwrite.toLowerCase() !== "y") {
          console.log("Configuration cancelled.");
          process.exit(0);
        }
      }

      await this.collectDatabaseConfig();
      await this.collectAuthConfig();
      await this.collectMonitoringConfig();
      await this.collectEmailConfig();
      await this.collectStorageConfig();
      await this.collectPaymentConfig();
      await this.collectOptionalServices();

      await this.generateConfigFile();

      console.log("");
      console.log("✅ Production configuration generated successfully!");
      console.log(`📄 Configuration saved to: ${this.outputPath}`);
      console.log("");
      console.log("🔒 SECURITY REMINDERS:");
      console.log("- Never commit .env.production to version control");
      console.log("- Rotate secrets regularly");
      console.log(
        "- Use environment-specific secrets in your deployment platform"
      );
      console.log("");
      console.log("🚀 Next steps:");
      console.log("1. Review the generated configuration");
      console.log("2. Test with: npm run validate-production");
      console.log("3. Deploy with: ./scripts/deploy-production.sh");
    } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  async collectDatabaseConfig() {
    console.log("📊 Database Configuration");
    console.log("-".repeat(30));

    this.config.DATABASE_URL = await this.question(
      "Database URL (PostgreSQL): "
    );
    this.config.DATABASE_MAX_CONNECTIONS =
      (await this.question("Max database connections (20): ")) || "20";
  }

  async collectAuthConfig() {
    console.log("\n🔐 Authentication Configuration");
    console.log("-".repeat(30));

    this.config.NEXTAUTH_URL = await this.question(
      "Production domain (https://yourdomain.com): "
    );

    const generateSecret = await this.question(
      "Generate secure NextAuth secret automatically? (Y/n): "
    );
    if (generateSecret.toLowerCase() !== "n") {
      this.config.NEXTAUTH_SECRET = this.generateSecureKey(64);
      console.log(`✓ Generated secure NextAuth secret`);
    } else {
      this.config.NEXTAUTH_SECRET = await this.question(
        "NextAuth secret (64+ characters): "
      );
    }
  }

  async collectMonitoringConfig() {
    console.log("\n📈 Monitoring Configuration");
    console.log("-".repeat(30));

    const useSentry = await this.question(
      "Enable Sentry error tracking? (Y/n): "
    );
    if (useSentry.toLowerCase() !== "n") {
      this.config.SENTRY_DSN = await this.question("Sentry DSN: ");
      this.config.SENTRY_ORG = await this.question("Sentry organization: ");
      this.config.SENTRY_PROJECT = await this.question("Sentry project: ");
    }

    const useRedis = await this.question("Enable Redis caching? (Y/n): ");
    if (useRedis.toLowerCase() !== "n") {
      this.config.REDIS_URL = await this.question("Redis URL: ");
    }
  }

  async collectEmailConfig() {
    console.log("\n📧 Email Configuration");
    console.log("-".repeat(30));

    const emailProvider = await this.question(
      "Email provider (1=SMTP, 2=Resend, 3=SendGrid): "
    );

    switch (emailProvider) {
      case "1":
        this.config.SMTP_HOST = await this.question("SMTP Host: ");
        this.config.SMTP_PORT =
          (await this.question("SMTP Port (587): ")) || "587";
        this.config.SMTP_USER = await this.question("SMTP Username: ");
        this.config.SMTP_PASS = await this.question("SMTP Password: ");
        this.config.SMTP_FROM = await this.question("From email address: ");
        break;
      case "2":
        this.config.RESEND_API_KEY = await this.question("Resend API Key: ");
        break;
      case "3":
        this.config.SENDGRID_API_KEY = await this.question(
          "SendGrid API Key: "
        );
        break;
    }
  }

  async collectStorageConfig() {
    console.log("\n☁️  Storage Configuration");
    console.log("-".repeat(30));

    const useS3 = await this.question("Use AWS S3 for file storage? (Y/n): ");
    if (useS3.toLowerCase() !== "n") {
      this.config.AWS_ACCESS_KEY_ID = await this.question(
        "AWS Access Key ID: "
      );
      this.config.AWS_SECRET_ACCESS_KEY = await this.question(
        "AWS Secret Access Key: "
      );
      this.config.AWS_REGION =
        (await this.question("AWS Region (eu-west-1): ")) || "eu-west-1";
      this.config.AWS_S3_BUCKET = await this.question("S3 Bucket Name: ");
    }
  }

  async collectPaymentConfig() {
    console.log("\n💳 Payment Configuration");
    console.log("-".repeat(30));

    const useStripe = await this.question("Enable Stripe payments? (Y/n): ");
    if (useStripe.toLowerCase() !== "n") {
      console.log("⚠️  Use LIVE keys for production!");
      this.config.STRIPE_SECRET_KEY = await this.question(
        "Stripe Secret Key (sk_live_...): "
      );
      this.config.STRIPE_PUBLISHABLE_KEY = await this.question(
        "Stripe Publishable Key (pk_live_...): "
      );
      this.config.STRIPE_WEBHOOK_SECRET = await this.question(
        "Stripe Webhook Secret: "
      );
    }
  }

  async collectOptionalServices() {
    console.log("\n🔧 Optional Services");
    console.log("-".repeat(30));

    // Set defaults for optional services
    this.config.NODE_ENV = "production";
    this.config.LOG_LEVEL = "info";
    this.config.RATE_LIMIT_ENABLED = "true";
    this.config.PERFORMANCE_MONITORING = "true";

    console.log("✓ Set default values for optional services");
  }

  async generateConfigFile() {
    // Read template
    const template = fs.readFileSync(this.templatePath, "utf8");

    // Replace placeholders with actual values
    let config = template;

    for (const [key, value] of Object.entries(this.config)) {
      const placeholder = new RegExp(`${key}="[^"]*"`, "g");
      config = config.replace(placeholder, `${key}="${value}"`);
    }

    // Write production config
    fs.writeFileSync(this.outputPath, config, { mode: 0o600 }); // Secure file permissions

    console.log(`\n✓ Configuration written to ${this.outputPath}`);
  }
}

// Run the wizard
if (require.main === module) {
  const wizard = new ProductionConfigWizard();
  wizard.run().catch(console.error);
}

module.exports = ProductionConfigWizard;
