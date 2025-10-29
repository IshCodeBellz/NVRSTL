import { z } from "zod";

// Environment validation schema
const ProductionEnvSchema = z.object({
  // Core
  DATABASE_URL: z.string().url("Invalid database URL"),
  NEXTAUTH_URL: z.string().url("Invalid NextAuth URL"),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NextAuth secret must be at least 32 characters"),

  // Shipping Carriers (at least one required)
  ROYAL_MAIL_API_KEY: z.string().optional(),
  ROYAL_MAIL_API_SECRET: z.string().optional(),
  DPD_API_KEY: z.string().optional(),
  FEDEX_API_KEY: z.string().optional(),
  UPS_API_KEY: z.string().optional(),
  DHL_API_KEY: z.string().optional(),

  // Webhooks
  WEBHOOK_BASE_URL: z.string().url("Invalid webhook base URL"),
  WEBHOOK_RETRY_ATTEMPTS: z
    .string()
    .regex(/^\d+$/, "Must be a number")
    .optional(),

  // Monitoring
  SENTRY_DSN: z.string().url("Invalid Sentry DSN").optional(),

  // Notifications (at least email required)
  MAILERSEND_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),

  // Performance
  REDIS_URL: z.string().optional(),

  // Security
  RATE_LIMIT_REQUESTS_PER_MINUTE: z
    .string()
    .regex(/^\d+$/, "Must be a number")
    .optional(),
});

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export function validateProductionEnvironment(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    recommendations: [],
  };

  try {
    // Validate core schema
    const env = ProductionEnvSchema.parse(process.env);

    // Check for at least one carrier
    const hasCarrier = !!(
      env.ROYAL_MAIL_API_KEY ||
      env.DPD_API_KEY ||
      env.FEDEX_API_KEY ||
      env.UPS_API_KEY ||
      env.DHL_API_KEY
    );

    if (!hasCarrier) {
      result.errors.push("At least one shipping carrier must be configured");
      result.isValid = false;
    }

    // Check for email service
    const hasEmail = !!(
      env.MAILERSEND_API_KEY ||
      env.RESEND_API_KEY ||
      env.SENDGRID_API_KEY
    );
    if (!hasEmail) {
      result.errors.push(
        "Email service must be configured (MAILERSEND_API_KEY, RESEND_API_KEY, or SENDGRID_API_KEY)"
      );
      result.isValid = false;
    }

    // Performance warnings
    if (!env.REDIS_URL) {
      result.warnings.push(
        "Redis not configured - consider adding for better performance"
      );
    }

    // Monitoring warnings
    if (!env.SENTRY_DSN) {
      result.warnings.push(
        "Sentry not configured - recommended for error tracking"
      );
    }

    // Security recommendations
    if (!env.RATE_LIMIT_REQUESTS_PER_MINUTE) {
      result.recommendations.push(
        "Consider setting up rate limiting for production"
      );
    }

    // Environment-specific checks
    if (process.env.NODE_ENV !== "production") {
      result.warnings.push("NODE_ENV is not set to 'production'");
    }

    // Carrier-specific validations
    if (env.ROYAL_MAIL_API_KEY && !env.ROYAL_MAIL_API_SECRET) {
      result.errors.push("Royal Mail API key provided but secret is missing");
      result.isValid = false;
    }

    // Webhook validation
    if (!env.WEBHOOK_BASE_URL.includes("https://")) {
      result.warnings.push("Webhook URL should use HTTPS in production");
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      result.errors.push(
        ...error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
      );
      result.isValid = false;
    } else {
      result.errors.push("Unexpected validation error");
      result.isValid = false;
    }
  }

  return result;
}

export function generateCarrierConfig() {
  const carriers = [];

  if (process.env.ROYAL_MAIL_API_KEY) {
    carriers.push({
      name: "ROYAL_MAIL",
      enabled: true,
      apiKey: process.env.ROYAL_MAIL_API_KEY,
      environment: process.env.ROYAL_MAIL_ENVIRONMENT || "sandbox",
      webhookUrl: `${process.env.WEBHOOK_BASE_URL}/shipping/royal-mail`,
    });
  }

  if (process.env.DPD_API_KEY) {
    carriers.push({
      name: "DPD",
      enabled: true,
      apiKey: process.env.DPD_API_KEY,
      environment: process.env.DPD_ENVIRONMENT || "sandbox",
      webhookUrl: `${process.env.WEBHOOK_BASE_URL}/shipping/dpd`,
    });
  }

  if (process.env.FEDEX_API_KEY) {
    carriers.push({
      name: "FEDEX",
      enabled: true,
      apiKey: process.env.FEDEX_API_KEY,
      environment: process.env.FEDEX_ENVIRONMENT || "sandbox",
      webhookUrl: `${process.env.WEBHOOK_BASE_URL}/shipping/fedex`,
    });
  }

  if (process.env.UPS_API_KEY) {
    carriers.push({
      name: "UPS",
      enabled: true,
      apiKey: process.env.UPS_API_KEY,
      environment: process.env.UPS_ENVIRONMENT || "sandbox",
      webhookUrl: `${process.env.WEBHOOK_BASE_URL}/shipping/ups`,
    });
  }

  if (process.env.DHL_API_KEY) {
    carriers.push({
      name: "DHL",
      enabled: true,
      apiKey: process.env.DHL_API_KEY,
      environment: process.env.DHL_ENVIRONMENT || "sandbox",
      webhookUrl: `${process.env.WEBHOOK_BASE_URL}/shipping/dhl`,
    });
  }

  return carriers;
}

export function getShippingConfig() {
  return {
    defaultCarrier: process.env.DEFAULT_CARRIER || "ROYAL_MAIL",
    freeShippingThreshold: parseInt(
      process.env.FREE_SHIPPING_THRESHOLD_PENCE || "5000"
    ),
    expeditedThreshold: parseInt(
      process.env.EXPEDITED_SHIPPING_THRESHOLD_PENCE || "10000"
    ),

    warehouse: {
      address: {
        line1: process.env.DEFAULT_WAREHOUSE_ADDRESS_LINE1 || "",
        city: process.env.DEFAULT_WAREHOUSE_CITY || "",
        postcode: process.env.DEFAULT_WAREHOUSE_POSTCODE || "",
        country: process.env.DEFAULT_WAREHOUSE_COUNTRY || "GB",
      },
      phone: process.env.DEFAULT_WAREHOUSE_PHONE || "",
    },

    fulfillment: {
      startHour: parseInt(process.env.FULFILLMENT_START_HOUR || "9"),
      endHour: parseInt(process.env.FULFILLMENT_END_HOUR || "17"),
      timezone: process.env.FULFILLMENT_TIMEZONE || "Europe/London",
    },

    webhooks: {
      baseUrl: process.env.WEBHOOK_BASE_URL,
      retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || "3"),
      retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY_MS || "1000"),
      timeout: parseInt(process.env.WEBHOOK_TIMEOUT_MS || "30000"),
    },
  };
}
