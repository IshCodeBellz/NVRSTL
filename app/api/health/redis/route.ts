import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { withRequest } from "@/lib/server/logger";
import { trackPerformance } from "@/lib/server/errors";

export const runtime = "nodejs";

// GET /api/health/redis - Redis-specific health check
export const GET = withRequest(async function GET() {
  const start = Date.now();
  const perf = trackPerformance("redis_health_check", {
    route: "/api/health/redis",
  });

  try {
    if (!process.env.REDIS_URL) {
      const response = {
        status: "not_configured",
        timestamp: new Date().toISOString(),
        response_time_ms: Date.now() - start,
        redis: {
          configured: false,
          message: "Redis URL not configured - caching will be disabled",
        },
      };

      perf.finish("ok");
      return NextResponse.json(response, {
        status: 200,
        headers: { "cache-control": "no-store" },
      });
    }

    // Try to import Redis service
    try {
      const { RedisService } = await import(
        "@/lib/server/performance/RedisService"
      );
      const redis = RedisService.getInstance();

      // Test Redis connectivity
      const testKey = `health-check-${Date.now()}`;
      const testValue = "health-test";

      // Test SET operation
      await redis.set(testKey, testValue, 10); // 10 second TTL

      // Test GET operation
      const retrievedValue = await redis.get(testKey);

      // Test DELETE operation
      await redis.del(testKey);

      const responseTime = Date.now() - start;
      const status =
        responseTime > 1000
          ? "slow"
          : responseTime > 500
          ? "degraded"
          : "healthy";

      const response = {
        status,
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime,
        redis: {
          configured: true,
          connection: "active",
          operations: {
            set: "successful",
            get: retrievedValue === testValue ? "successful" : "failed",
            delete: "successful",
          },
          info: {
            url_configured: true,
            connection_status: "connected",
          },
        },
      };

      perf.finish("ok");
      return NextResponse.json(response, {
        status: status === "healthy" ? 200 : 503,
        headers: { "cache-control": "no-store" },
      });
    } catch (redisError) {
      logger.error("Redis health check error:", redisError);

      const response = {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        response_time_ms: Date.now() - start,
        redis: {
          configured: true,
          connection: "failed",
          error:
            redisError instanceof Error
              ? redisError.message
              : "Redis connection failed",
        },
      };

      perf.finish("error");
      return NextResponse.json(response, {
        status: 503,
        headers: { "cache-control": "no-store" },
      });
    }
  } catch (error) {
    logger.error("Redis health check setup error:", error);
    perf.finish("error");

    const response = {
      status: "error",
      timestamp: new Date().toISOString(),
      response_time_ms: Date.now() - start,
      error:
        error instanceof Error ? error.message : "Health check setup failed",
      redis: {
        configured: Boolean(process.env.REDIS_URL),
        connection: "unknown",
      },
    };

    return NextResponse.json(response, {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }
});
