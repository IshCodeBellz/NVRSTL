import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { RateLimitService, RateLimitConfigs } from "@/lib/server/rateLimit";
import { IPSecurityService } from "@/lib/server/ipSecurity";
import { CaptchaService } from "@/lib/server/captcha";
import { PasswordSecurity } from "@/lib/server/passwordSecurity";
import { SecurityService } from "@/lib/server/security";
import { SecurityEventType } from "@/lib/security";
import { z } from "zod";

const securityTestSchema = z.object({
  action: z.enum(["login", "register", "password_check", "ip_analysis"]),
  data: z.record(z.any()).optional(),
  captchaToken: z.string().optional(),
});

/**
 * Security demonstration endpoint showcasing Phase 2 features
 * POST /api/security/demo
 */
export async function POST(request: NextRequest) {
  try {
    // Extract request info
    const ip = IPSecurityService.extractIP(request);
    const userAgent = request.headers.get("user-agent") || "unknown";

    logger.info(`Security demo request from IP: ${ip}`);

    // 1. RATE LIMITING CHECK
    const rateLimitKey = RateLimitService.generateIPKey(
      request,
      "/api/security/demo"
    );
    const rateLimitResult = await RateLimitService.checkRateLimit(
      rateLimitKey,
      RateLimitConfigs.API_GENERAL
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
          security: {
            rateLimit: {
              blocked: true,
              remaining: rateLimitResult.remaining,
              resetTime: rateLimitResult.resetTime,
            },
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
          },
        }
      );
    }

    // 2. IP SECURITY ANALYSIS
    const ipInfo = await IPSecurityService.analyzeIP(ip);
    logger.info(`IP Analysis:`, {
      ip: ipInfo.ip,
      country: ipInfo.country,
      riskScore: ipInfo.riskScore,
      isVPN: ipInfo.isVPN,
    });

    // 3. PARSE REQUEST BODY
    const body = await request.json();
    const { action, data, captchaToken } = securityTestSchema.parse(body);

    // 4. CAPTCHA VERIFICATION (for high-risk scenarios)
    let captchaResult = null;
    if (ipInfo.riskScore >= 60 || ipInfo.isVPN) {
      if (!captchaToken) {
        return NextResponse.json(
          {
            error: "CAPTCHA required for high-risk requests",
            security: {
              ipInfo,
              captchaRequired: true,
              riskScore: ipInfo.riskScore,
            },
          },
          { status: 400 }
        );
      }

      captchaResult = await CaptchaService.verifyCaptcha(
        captchaToken,
        {
          userAgent,
          ipAddress: ip,
          endpoint: "/api/security/demo",
          riskScore: ipInfo.riskScore,
        },
        "login"
      );

      if (!captchaResult.success) {
        return NextResponse.json(
          {
            error: "CAPTCHA verification failed",
            security: {
              captcha: captchaResult,
              ipInfo,
            },
          },
          { status: 400 }
        );
      }
    }

    // 5. ACTION-SPECIFIC SECURITY CHECKS
    let actionResult = {};

    switch (action) {
      case "password_check":
        if (data?.password) {
          const passwordAnalysis = PasswordSecurity.analyzeStrength(
            data.password,
            { email: data.email, name: data.name }
          );

          const breachCheck = await PasswordSecurity.checkBreachDatabase(
            data.password
          );

          actionResult = {
            passwordSecurity: {
              strength: passwordAnalysis,
              breachCheck,
              suggestion:
                passwordAnalysis.score < 3
                  ? PasswordSecurity.generateSecurePassword()
                  : null,
            },
          };
        }
        break;

      case "ip_analysis":
        const ipReputation = await IPSecurityService.getIPReputation(ip);
        actionResult = {
          ipAnalysis: {
            ...ipInfo,
            reputation: ipReputation,
            isHighRisk: ipInfo.riskScore >= 70,
            recommendations: getIPRecommendations(ipInfo),
          },
        };
        break;

      case "login":
        // Simulate login security checks
        actionResult = {
          loginSecurity: {
            mfaRequired: ipInfo.riskScore >= 50 || ipInfo.isVPN,
            deviceTrustRequired: ipInfo.riskScore >= 70,
            additionalVerification: ipInfo.riskScore >= 80,
          },
        };
        break;

      case "register":
        // Simulate registration security checks
        actionResult = {
          registrationSecurity: {
            captchaRequired: true,
            emailVerificationRequired: true,
            phoneVerificationRequired: ipInfo.riskScore >= 60,
            manualReview: ipInfo.riskScore >= 80,
          },
        };
        break;
    }

    // 6. LOG SECURITY EVENT
    await SecurityService.logSecurityEvent(
      SecurityEventType.MFA_VERIFICATION_SUCCESS,
      {
        userId: data?.userId,
        ipAddress: ip,
        userAgent,
        endpoint: "/api/security/demo",
        details: {
          action,
          ipInfo,
          captchaUsed: !!captchaResult,
          riskScore: ipInfo.riskScore,
        },
      }
    );

    // 7. RETURN COMPREHENSIVE SECURITY RESPONSE
    return NextResponse.json({
      success: true,
      action,
      security: {
        rateLimit: {
          allowed: true,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
        },
        ipSecurity: {
          info: ipInfo,
          blocked: false,
          recommendations: getIPRecommendations(ipInfo),
        },
        captcha: captchaResult
          ? {
              verified: captchaResult.success,
              score: captchaResult.score,
            }
          : {
              required: false,
              reason: "Low risk request",
            },
        overallRiskScore: calculateOverallRisk({
          ipRisk: ipInfo.riskScore,
          captchaScore: captchaResult?.score,
          rateLimitStatus: rateLimitResult.remaining / rateLimitResult.limit,
        }),
      },
      result: actionResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Security demo error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Security check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Get IP-based security recommendations
 */
function getIPRecommendations(ipInfo: {
  riskScore: number;
  isVPN?: boolean;
  isTor?: boolean;
}) {
  const recommendations: string[] = [];

  if (ipInfo.riskScore >= 80) {
    recommendations.push("Consider blocking this IP temporarily");
    recommendations.push("Require additional verification");
  } else if (ipInfo.riskScore >= 60) {
    recommendations.push("Enable MFA for this session");
    recommendations.push("Monitor activity closely");
  }

  if (ipInfo.isVPN) {
    recommendations.push("VPN detected - consider additional verification");
  }

  if (ipInfo.isTor) {
    recommendations.push("Tor exit node - high security measures recommended");
  }

  return recommendations;
}

/**
 * Calculate overall risk score from multiple factors
 */
function calculateOverallRisk(factors: {
  ipRisk: number;
  captchaScore?: number;
  rateLimitStatus: number;
}): number {
  let risk = factors.ipRisk * 0.6; // IP risk is primary factor

  // CAPTCHA success reduces risk
  if (factors.captchaScore) {
    risk *= factors.captchaScore; // Multiply by CAPTCHA confidence
  }

  // Rate limit health
  if (factors.rateLimitStatus < 0.5) {
    risk += 20; // Add risk for high rate limit usage
  }

  return Math.min(100, Math.max(0, Math.round(risk)));
}

/**
 * Get security configuration for client
 * GET /api/security/demo
 */
export async function GET(request: NextRequest) {
  try {
    const ip = IPSecurityService.extractIP(request);
    const ipInfo = await IPSecurityService.analyzeIP(ip);

    return NextResponse.json({
      security: {
        captcha: CaptchaService.getClientConfig("login"),
        ipInfo: {
          country: ipInfo.country,
          riskScore: ipInfo.riskScore,
          requiresAdditionalSecurity: ipInfo.riskScore >= 60,
        },
        policies: {
          rateLimit: {
            windowMs: RateLimitConfigs.API_GENERAL.windowMs,
            maxRequests: RateLimitConfigs.API_GENERAL.maxRequests,
          },
          password: {
            minLength: 8,
            requireMFA: ipInfo.riskScore >= 50,
          },
        },
      },
      features: {
        mfa: { available: true, recommended: ipInfo.riskScore >= 50 },
        passwordSecurity: { enabled: true },
        ipFiltering: { enabled: true },
        captcha: { enabled: true },
        rateLimit: { enabled: true },
      },
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Security config error:", error);

    return NextResponse.json(
      {
        error: "Failed to get security configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
