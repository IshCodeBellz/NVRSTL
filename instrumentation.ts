// Next.js instrumentation file for Sentry initialization
// This runs before any other code in both server and edge environments

export async function register() {
  // Only initialize Sentry in production or when explicitly enabled
  if (
    process.env.NODE_ENV === "production" ||
    process.env.SENTRY_ENABLED === "true"
  ) {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      // Server-side initialization
      await import("./sentry.server.config");
    }

    if (process.env.NEXT_RUNTIME === "edge") {
      // Edge runtime initialization (if needed)
      await import("./sentry.client.config");
    }
  }

  // Log initialization status
  console.log(
    "[Instrumentation] Sentry enabled:",
    process.env.NODE_ENV === "production" ||
      process.env.SENTRY_ENABLED === "true"
  );
}
