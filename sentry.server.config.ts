// Sentry configuration for server-side error monitoring
import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Environment detection
  environment: process.env.NODE_ENV || "development",

  // Performance monitoring (lower sample rate for server)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0.1,

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || "dev",

  // Server-side error filtering
  beforeSend(event, hint) {
    // Skip test environment errors
    if (process.env.NODE_ENV === "test") return null;

    // Skip development errors unless explicitly enabled
    if (process.env.NODE_ENV === "development" && !process.env.SENTRY_ENABLED) {
      return null;
    }

    // Add server context
    event.tags = {
      ...event.tags,
      runtime: "server",
      node_version: process.version,
    };

    // Enhanced error context for API routes
    if (event.transaction?.startsWith("/api/")) {
      event.tags.api_route = event.transaction;
    }

    // Log server errors
    const error = hint.originalException;
    if (error instanceof Error) {
      console.error("[Sentry Server]", error.message, {
        stack: error.stack,
        transaction: event.transaction,
      });
    }

    return event;
  },

  // Custom tags for server events
  initialScope: {
    tags: {
      component: "nvrstl-server",
      runtime: "server",
    },
  },

  // Debug mode for development
  debug:
    process.env.NODE_ENV === "development" &&
    process.env.SENTRY_DEBUG === "true",

  // Enable in production or when explicitly enabled
  enabled:
    process.env.NODE_ENV === "production" ||
    process.env.SENTRY_ENABLED === "true",
});
