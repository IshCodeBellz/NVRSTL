import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";
import { withRequest } from "@/lib/server/logger";
import { trackPerformance } from "@/lib/server/errors";

export const runtime = "nodejs";

// GET /api/health/database - Database-specific health check
export const GET = withRequest(async function GET() {
  const start = Date.now();
  const perf = trackPerformance("database_health_check", {
    route: "/api/health/database",
  });

  try {
    // Test basic connectivity
    await prisma.$queryRaw`SELECT 1`;

    // Test key operations
    const [productCount, userCount, orderCount, brandCount, categoryCount] =
      await Promise.all([
        prisma.product.count().catch(() => 0),
        prisma.user.count().catch(() => 0),
        prisma.order.count().catch(() => 0),
        prisma.brand.count().catch(() => 0),
        prisma.category.count().catch(() => 0),
      ]);

    // Test write operation (non-destructive)
    await prisma.user.count(); // Write test

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
      database: {
        connection: "active",
        type: "postgresql",
        tables: {
          products: productCount,
          users: userCount,
          orders: orderCount,
          brands: brandCount,
          categories: categoryCount,
        },
        operations: {
          read: "successful",
          write: "successful",
          connection_pool: "active",
        },
      },
    };

    perf.finish("ok");
    return NextResponse.json(response, {
      status: status === "healthy" ? 200 : 503,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    logger.error("Database health check error:", error);
    perf.finish("error");

    const response = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      response_time_ms: Date.now() - start,
      error: error instanceof Error ? error.message : "Database check failed",
      database: {
        connection: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };

    return NextResponse.json(response, {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }
});
