// Sentry configuration for error monitoring and performance tracking
import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Environment detection
  environment: process.env.NODE_ENV || "development",

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || "dev",

  // Error filtering - don't report these common/expected errors
  beforeSend(event, hint) {
    // Skip test environment errors
    if (process.env.NODE_ENV === "test") return null;

    // Skip known client-side network errors
    if (event.exception?.values?.[0]?.type === "ChunkLoadError") return null;
    if (event.exception?.values?.[0]?.value?.includes("Loading chunk"))
      return null;

    // Skip 404s and other expected HTTP errors
    if (event.tags?.["http.status_code"] === "404") return null;

    // Log the error for debugging
    const error = hint.originalException;
    if (error instanceof Error) {
      console.error("[Sentry]", error.message, error.stack);
    }

    return event;
  },

  // Custom tags for all events
  initialScope: {
    tags: {
      component: "nvrstl",
      runtime: typeof window !== "undefined" ? "client" : "server",
    },
  },

  // Enhanced error context
  beforeSendTransaction(event) {
    // Add custom context for performance monitoring
    if (event.type === "transaction") {
      event.tags = {
        ...event.tags,
        route: event.transaction || "unknown",
      };
    }
    return event;
  },

  // Integration configuration
  integrations: [
    // Default integrations are automatically included
    // Custom integrations can be added here
  ],

  // Debug mode for development
  debug: process.env.NODE_ENV === "development",

  // Disable Sentry in development unless explicitly enabled
  enabled:
    process.env.NODE_ENV === "production" ||
    process.env.SENTRY_ENABLED === "true",
});
