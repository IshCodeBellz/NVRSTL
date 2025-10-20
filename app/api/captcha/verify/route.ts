import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { CaptchaService } from "@/lib/server/captcha";

export async function POST(request: NextRequest) {
  try {
    const { token, configKey = "default" } = await request.json();

    if (!token) {
      return NextResponse.json(
        { message: "CAPTCHA token is required" },
        { status: 400 }
      );
    }

    // Determine client IP in the shape expected by CaptchaService
    const ipHeader =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("cf-connecting-ip");
    const ip = ipHeader
      ? ipHeader.split(",")[0].trim()
      : /* eslint-disable-next-line */
        (request as any).ip || "unknown";

    // Narrow config key to supported values; default to 'login'
    const allowedKeys = ["login", "register", "checkout", "contact"] as const;
    const captchaKey = (allowedKeys as readonly string[]).includes(configKey)
      ? (configKey as (typeof allowedKeys)[number])
      : "login";

    const verification = await CaptchaService.verifyCaptcha(
      token,
      { ip },
      captchaKey
    );

    if (!verification.success) {
      return NextResponse.json(
        {
          message: "CAPTCHA verification failed",
          errors: verification.errorCodes,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "CAPTCHA verified successfully",
      score: verification.score,
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("CAPTCHA verification error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configKey = searchParams.get("config") || "default";

    const config = CaptchaService.getClientConfig(configKey);

    return NextResponse.json({ config });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Failed to get CAPTCHA config:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
