// Central environment validation & helper utilities.
// Provides a one-time warning log set so we don't spam serverless logs.

type EnvIssue = { key: string; message: string; level: "warn" | "error" };
let validated = false;
let issuesCache: EnvIssue[] = [];

export interface EnvSnapshot {
  NEXTAUTH_SECRET?: string;
  DATABASE_URL?: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  NODE_ENV?: string;
  PASSWORD_RESET_TOKEN_TTL_MINUTES?: string; // optional override, defaults to 30
}

export function snapshotEnv(): EnvSnapshot {
  return {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    EMAIL_FROM: process.env.EMAIL_FROM,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    PASSWORD_RESET_TOKEN_TTL_MINUTES:
      process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
  };
}

export function validateEnv(): EnvIssue[] {
  if (validated) return issuesCache; // idempotent
  validated = true;
  const env = snapshotEnv();
  const issues: EnvIssue[] = [];
  const push = (
    key: string,
    message: string,
    level: "warn" | "error" = "warn"
  ) => {
    issues.push({ key, message, level });
  };

  // Critical secrets
  if (!env.NEXTAUTH_SECRET)
    push(
      "NEXTAUTH_SECRET",
      "Missing auth secret; sessions may be insecure or fail.",
      "error"
    );
  if (!env.DATABASE_URL)
    push(
      "DATABASE_URL",
      "Missing database URL; Prisma will fail to connect.",
      "error"
    );

  // Stripe — allow simulated mode if absent
  if (!env.STRIPE_SECRET_KEY) {
    push(
      "STRIPE_SECRET_KEY",
      "Stripe secret key missing. Payments run in simulated mode.",
      "warn"
    );
  } else {
    if (!env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      push(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        "Publishable key missing; PaymentElement cannot mount on client.",
        "error"
      );
    }
    if (!env.STRIPE_WEBHOOK_SECRET) {
      push(
        "STRIPE_WEBHOOK_SECRET",
        "Webhook secret missing; payment finalization relies on client polling / success redirect only.",
        "warn"
      );
    } else if (!/^whsec_[A-Za-z0-9]+$/.test(env.STRIPE_WEBHOOK_SECRET)) {
      push(
        "STRIPE_WEBHOOK_SECRET",
        "Webhook secret does not match expected whsec_ format.",
        "warn"
      );
    }
  }

  // Email provider
  if (!env.RESEND_API_KEY) {
    push(
      "RESEND_API_KEY",
      "Transactional emails disabled (no RESEND_API_KEY). Fallback is console log.",
      "warn"
    );
  }
  if (!env.EMAIL_FROM) {
    push(
      "EMAIL_FROM",
      "No default FROM email configured. Some providers may reject mail.",
      "warn"
    );
  }

  // Password reset TTL sanity check (optional)
  if (env.PASSWORD_RESET_TOKEN_TTL_MINUTES) {
    const ttl = parseInt(env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 10);
    if (Number.isNaN(ttl) || ttl < 5 || ttl > 1440) {
      push(
        "PASSWORD_RESET_TOKEN_TTL_MINUTES",
        "TTL must be integer minutes between 5 and 1440; falling back to default (30).",
        "warn"
      );
    }
  }

  issuesCache = issues;
  if (issues.length) {
    // Single grouped log to avoid noise
    const grouped = issues
      .map(
        (i) =>
          `${i.level === "error" ? "ERROR" : "WARN"} ${i.key}: ${i.message}`
      )
      .join("\n");
    // eslint-disable-next-line no-console
    console.log("[env validation]\n" + grouped);
  }
  return issues;
}

// Helper to assert production readiness (can be used in a /health or build script)
export function hasBlockingEnvIssues(): boolean {
  return validateEnv().some((i) => i.level === "error");
}
