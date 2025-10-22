import { NextRequest } from "next/server";

export interface CaptchaConfig {
  provider: "recaptcha" | "hcaptcha" | "turnstile";
  enabled: boolean;
  siteKey?: string;
  secretKey?: string;
  threshold?: number;
}

export interface CaptchaSettings {
  login: CaptchaConfig;
  register: CaptchaConfig;
  checkout: CaptchaConfig;
  contact: CaptchaConfig;
}

// Default configuration
const DEFAULT_CAPTCHA_SETTINGS: CaptchaSettings = {
  login: {
    provider: "recaptcha",
    siteKey: process.env.RECAPTCHA_SITE_KEY,
    secretKey: process.env.RECAPTCHA_SECRET_KEY,
    threshold: 0.5,
    enabled: process.env.NODE_ENV === "production",
  },
  register: {
    provider: "recaptcha",
    siteKey: process.env.RECAPTCHA_SITE_KEY,
    secretKey: process.env.RECAPTCHA_SECRET_KEY,
    threshold: 0.5,
    enabled: process.env.NODE_ENV === "production",
  },
  checkout: {
    provider: "recaptcha",
    siteKey: process.env.RECAPTCHA_SITE_KEY,
    secretKey: process.env.RECAPTCHA_SECRET_KEY,
    threshold: 0.5,
    enabled: process.env.NODE_ENV === "production",
  },
  contact: {
    provider: "recaptcha",
    siteKey: process.env.RECAPTCHA_SITE_KEY,
    secretKey: process.env.RECAPTCHA_SECRET_KEY,
    threshold: 0.5,
    enabled: process.env.NODE_ENV === "production",
  },
};

export interface CaptchaVerificationResult {
  success: boolean;
  score?: number;
  action?: string;
  challengeTimestamp?: Date;
  hostname?: string;
  errorCodes?: string[];
}

export interface CaptchaContext {
  ip?: string;
  userAgent?: string;
  ipAddress?: string;
  endpoint?: string;
  riskScore?: number;
}

export class CaptchaService {
  // Verify CAPTCHA token
  static async verifyCaptcha(
    token: string,
    context: CaptchaContext,
    configKey: keyof CaptchaSettings = "login"
  ): Promise<CaptchaVerificationResult> {
    const config = DEFAULT_CAPTCHA_SETTINGS[configKey];

    if (!config.enabled) {
      // Skip CAPTCHA in development or when disabled
      return { success: true, score: 1, action: "bypass" };
    }

    if (!token) {
      return { success: false, errorCodes: ["missing-input-response"] };
    }

    try {
      switch (config.provider) {
        case "recaptcha":
          return await this.verifyRecaptcha(token, config, context);
        case "hcaptcha":
          return await this.verifyHCaptcha(token, config, context);
        case "turnstile":
          return await this.verifyTurnstile(token, config, context);
        default:
          return { success: false, errorCodes: ["unsupported-provider"] };
      }
    } catch (error) {
      console.error("CAPTCHA verification error:", error);
      return { success: false, errorCodes: ["verification-error"] };
    }
  }

  private static async verifyRecaptcha(
    token: string,
    config: CaptchaConfig,
    context: CaptchaContext
  ): Promise<CaptchaVerificationResult> {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: config.secretKey || "",
        response: token,
        remoteip: context.ip || "",
      }),
    });
    const data = (await res.json()) as {
      success: boolean;
      score?: number;
      action?: string;
      challenge_ts?: string;
      hostname?: string;
      [k: string]: unknown;
    };
    const passed =
      typeof data.score === "number" && config.threshold
        ? data.success && data.score >= config.threshold
        : data.success;
    return {
      success: passed,
      score: data.score,
      action: data.action,
      challengeTimestamp: data.challenge_ts
        ? new Date(data.challenge_ts)
        : undefined,
      hostname: data.hostname,
    };
  }

  private static async verifyHCaptcha(
    token: string,
    config: CaptchaConfig,
    context: CaptchaContext
  ): Promise<CaptchaVerificationResult> {
    const res = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: config.secretKey || "",
        response: token,
        remoteip: context.ip || context.ipAddress || "",
        sitekey: config.siteKey || "",
      }),
    });
    const data = (await res.json()) as {
      success: boolean;
      challenge_ts?: string;
      hostname?: string;
      [k: string]: unknown;
    };
    return {
      success: data.success,
      challengeTimestamp: data.challenge_ts
        ? new Date(data.challenge_ts)
        : undefined,
      hostname: data.hostname,
    };
  }

  private static async verifyTurnstile(
    token: string,
    config: CaptchaConfig,
    context: CaptchaContext
  ): Promise<CaptchaVerificationResult> {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: config.secretKey || "",
          response: token,
          remoteip: context.ip || "",
        }),
      }
    );
    const data = (await res.json()) as {
      success: boolean;
      challenge_ts?: string;
      hostname?: string;
      [k: string]: unknown;
    };
    return {
      success: data.success,
      challengeTimestamp: data.challenge_ts
        ? new Date(data.challenge_ts)
        : undefined,
      hostname: data.hostname,
    };
  }

  static shouldRequireCaptcha(context: {
    riskScore?: number;
    failedAttempts?: number;
    isNewUser?: boolean;
    isVPN?: boolean;
    endpoint?: string;
  }): boolean {
    const {
      riskScore = 0,
      failedAttempts = 0,
      isNewUser = false,
      isVPN = false,
      endpoint,
    } = context;

    if (endpoint && endpoint.includes("register")) return true;
    if (riskScore >= 70) return true;
    if (failedAttempts >= 3) return true;
    if (isVPN && endpoint && endpoint.includes("login")) return true;

    const endpointRules: Record<string, boolean> = {
      "/api/auth/login": failedAttempts >= 2,
      "/api/checkout": riskScore >= 50,
      "/api/contact": true,
      "/api/reviews": isNewUser || riskScore >= 40,
    };

    return endpoint ? endpointRules[endpoint] ?? false : false;
  }

  static getClientConfig(configKey?: string): {
    provider: string;
    siteKey: string;
    enabled: boolean;
    threshold: number;
  } {
    const key = (configKey as keyof CaptchaSettings) || "login";
    const config =
      DEFAULT_CAPTCHA_SETTINGS[key] || DEFAULT_CAPTCHA_SETTINGS.login;
    return {
      provider: config.provider,
      siteKey: config.siteKey || "",
      enabled: config.enabled,
      threshold: config.threshold || 0.5,
    };
  }

  static updateConfig(
    configKey: keyof CaptchaSettings,
    updates: Partial<CaptchaConfig>
  ): void {
    // In a real implementation, persist updates to DB/env; here we just log.
    console.log("Updating CAPTCHA config:", configKey, updates);
  }

  static createCaptchaMiddleware(configKey: keyof CaptchaSettings = "login") {
    return async (req: NextRequest) => {
      const config =
        DEFAULT_CAPTCHA_SETTINGS[configKey] || DEFAULT_CAPTCHA_SETTINGS.login;
      if (!config.enabled) return { required: false, verified: true };

      const body = await req
        .json()
        .catch(() => ({} as Record<string, unknown>));
      const captchaToken =
        (body["captchaToken"] as string | undefined) ||
        req.headers.get("x-captcha-token") ||
        "";

      if (!captchaToken) {
        return { required: true, verified: false, error: "missing-token" };
      }

      const ip = CaptchaService.extractIP(req);
      const result = await this.verifyCaptcha(captchaToken, { ip }, configKey);

      return {
        required: true,
        verified: result.success,
        score: result.score,
        error: result.success ? undefined : result.errorCodes?.[0] || "failed",
      };
    };
  }

  private static extractIP(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    const realIP = req.headers.get("x-real-ip");
    const cfIP = req.headers.get("cf-connecting-ip");
    if (forwarded) return forwarded.split(",")[0]?.trim();
    if (realIP) return realIP;
    if (cfIP) return cfIP;
    // Fallback: some deployments may expose req.ip via non-typed extension
    return (req as unknown as { ip?: string }).ip || "unknown";
  }

  static async getAnalytics(): Promise<{
    totalVerifications: number;
    successRate: number;
    averageScore: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
  }> {
    try {
      // Stub analytics
      return {
        totalVerifications: 0,
        successRate: 0,
        averageScore: 0,
        topFailureReasons: [],
      };
    } catch (error) {
      console.error("Error getting CAPTCHA analytics:", error);
      return {
        totalVerifications: 0,
        successRate: 0,
        averageScore: 0,
        topFailureReasons: [],
      };
    }
  }
}
