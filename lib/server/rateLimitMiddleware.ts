import { NextRequest, NextResponse } from "next/server";
import { RateLimitService, RateLimitConfig } from "./rateLimit";

/**
 * Rate limiting middleware for API routes
 */
export function withRateLimit(config: RateLimitConfig) {
  return async function rateLimitMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
  ): Promise<NextResponse> {
    try {
      // Generate rate limit key
      const key = config.keyGenerator
        ? config.keyGenerator(req)
        : RateLimitService.generateIPKey(req, req.nextUrl.pathname);

      // Check rate limit
      const result = await RateLimitService.checkRateLimit(key, config);

      // Add rate limit headers
      const response = result.allowed
        ? await handler(req)
        : NextResponse.json(
            {
              error: "Too many requests",
              message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
              retryAfter: result.retryAfter,
            },
            { status: 429 }
          );

      // Add rate limit headers to response
      response.headers.set("X-RateLimit-Limit", result.limit.toString());
      response.headers.set(
        "X-RateLimit-Remaining",
        result.remaining.toString()
      );
      response.headers.set(
        "X-RateLimit-Reset",
        Math.ceil(result.resetTime.getTime() / 1000).toString()
      );

      if (result.retryAfter) {
        response.headers.set("Retry-After", result.retryAfter.toString());
      }

      return response;
    } catch (error) {
      console.error("Error:", error);
      console.error("Rate limiting middleware error:", error);
      // If rate limiting fails, allow the request to proceed
      return await handler(req);
    }
  };
}

/**
 * Rate limiting decorator for API route functions
 */
export function rateLimit(config: RateLimitConfig) {
  return function decorator(
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (req: NextRequest, ...args: unknown[]) {
      const middleware = withRateLimit(config);
      return middleware(req, () => originalMethod.call(this, req, ...args));
    };

    return descriptor;
  };
}

/**
 * Multiple rate limits for different scenarios
 */
export function withMultipleRateLimits(
  configs: { key: string; config: RateLimitConfig }[]
) {
  return async function multiRateLimitMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
  ): Promise<NextResponse> {
    try {
      for (const { key: configKey, config } of configs) {
        const key = config.keyGenerator
          ? config.keyGenerator(req)
          : `${configKey}:${RateLimitService.generateIPKey(
              req,
              req.nextUrl.pathname
            )}`;

        const result = await RateLimitService.checkRateLimit(key, config);

        if (!result.allowed) {
          const response = NextResponse.json(
            {
              error: "Too many requests",
              message: `Rate limit exceeded for ${configKey}. Try again in ${result.retryAfter} seconds.`,
              retryAfter: result.retryAfter,
              limitType: configKey,
            },
            { status: 429 }
          );

          // Add rate limit headers
          response.headers.set("X-RateLimit-Limit", result.limit.toString());
          response.headers.set(
            "X-RateLimit-Remaining",
            result.remaining.toString()
          );
          response.headers.set(
            "X-RateLimit-Reset",
            Math.ceil(result.resetTime.getTime() / 1000).toString()
          );
          response.headers.set("Retry-After", result.retryAfter!.toString());

          return response;
        }
      }

      // All rate limits passed, proceed with request
      return await handler(req);
    } catch (error) {
      console.error("Error:", error);
      console.error("Multiple rate limiting middleware error:", error);
      // If rate limiting fails, allow the request to proceed
      return await handler(req);
    }
  };
}

/**
 * Helper to create rate limit key generators
 */
export const KeyGenerators = {
  /**
   * Rate limit by IP address
   */
  byIP: (endpoint: string) => (req: NextRequest) =>
    RateLimitService.generateIPKey(req, endpoint),

  /**
   * Rate limit by user ID (requires authentication)
   */
  byUser: (endpoint: string) => (req: NextRequest) => {
    // This would need to extract user ID from session/token
    // For now, fallback to IP
    return RateLimitService.generateIPKey(req, endpoint);
  },

  /**
   * Rate limit by email address
   */
  byEmail: (endpoint: string) => (req: NextRequest) => {
    // This would need to extract email from request body or session
    // For now, fallback to IP
    return RateLimitService.generateIPKey(req, endpoint);
  },

  /**
   * Combined IP + endpoint rate limiting
   */
  byIPAndEndpoint: (req: NextRequest) =>
    RateLimitService.generateIPKey(req, req.nextUrl.pathname),

  /**
   * Custom key generator
   */
  custom: (keyFn: (req: NextRequest) => string) => keyFn,
};
