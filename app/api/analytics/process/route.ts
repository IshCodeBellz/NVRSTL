import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { withRequest } from "@/lib/server/logger";
import { captureError, trackPerformance } from "@/lib/server/errors";
import { prisma } from "@/lib/server/prisma";

// POST /api/analytics/process - Process analytics data (for cron jobs)
export const POST = withRequest(async function POST(req: NextRequest) {
  const start = Date.now();
  const perf = trackPerformance("analytics_process_endpoint", {
    route: "/api/analytics/process",
  });

  try {
    // Verify this is called by a cron service (basic auth check)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "development-secret";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date } = await req.json();
    const processDate = date ? new Date(date) : new Date();

    logger.info(
      `Processing analytics for date: ${
        processDate.toISOString().split("T")[0]
      }`
    );

    // Process basic analytics using existing models
    const results = await processBasicAnalytics(processDate);

    perf.finish("ok");
    return NextResponse.json({
      success: true,
      date: processDate.toISOString().split("T")[0],
      processed: results,
      timestamp: new Date().toISOString(),
      request_duration_ms: Date.now() - start,
    });
  } catch (error) {
    perf.finish("error");
    captureError(
      error instanceof Error ? error : new Error("Analytics processing failed"),
      { route: "/api/analytics/process" },
      "error"
    );

    return NextResponse.json(
      {
        error: "processing_failed",
        message: "Failed to process analytics",
        request_duration_ms: Date.now() - start,
      },
      { status: 500 }
    );
  }
});

async function processBasicAnalytics(date: Date) {
  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const nextDay = new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000);

  logger.info(
    `Processing analytics from ${dateOnly.toISOString()} to ${nextDay.toISOString()}`
  );

  const results = {
    updatedProducts: 0,
    processedOrders: 0,
    processedUsers: 0,
    errors: [] as string[],
  };

  try {
    // Update product metrics based on user behavior
    const productViews = await prisma.userBehavior.groupBy({
      by: ["productId"],
      where: {
        eventType: "VIEW",
        timestamp: {
          gte: dateOnly,
          lt: nextDay,
        },
        productId: { not: null },
      },
      _count: { _all: true },
    });

    const productPurchases = await prisma.userBehavior.groupBy({
      by: ["productId"],
      where: {
        eventType: "PURCHASE",
        timestamp: {
          gte: dateOnly,
          lt: nextDay,
        },
        productId: { not: null },
      },
      _count: { _all: true },
    });

    // Update product metrics
    for (const productView of productViews) {
      if (productView.productId) {
        const purchaseCount =
          productPurchases.find((p) => p.productId === productView.productId)
            ?._count._all || 0;

        await prisma.productMetrics.upsert({
          where: { productId: productView.productId },
          update: {
            views: { increment: productView._count._all },
            purchases: { increment: purchaseCount },
            updatedAt: new Date(),
          },
          create: {
            productId: productView.productId,
            views: productView._count._all,
            purchases: purchaseCount,
          },
        });

        results.updatedProducts++;
      }
    }

    // Update any products that had purchases but no views recorded
    for (const productPurchase of productPurchases) {
      if (
        productPurchase.productId &&
        !productViews.find((v) => v.productId === productPurchase.productId)
      ) {
        await prisma.productMetrics.upsert({
          where: { productId: productPurchase.productId },
          update: {
            purchases: { increment: productPurchase._count._all },
            updatedAt: new Date(),
          },
          create: {
            productId: productPurchase.productId,
            views: 0,
            purchases: productPurchase._count._all,
          },
        });

        results.updatedProducts++;
      }
    }

    // Count processed orders and users for the day
    results.processedOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: dateOnly,
          lt: nextDay,
        },
      },
    });

    results.processedUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: dateOnly,
          lt: nextDay,
        },
        isAdmin: false,
      },
    });

    logger.info(`Analytics processing completed:`, results);
    return results;
  } catch (error) {
    logger.error("Error in analytics processing:", error);
    results.errors.push(
      error instanceof Error ? error.message : "Unknown error"
    );
    return results;
  }
}

// GET /api/analytics/process - Get processing status (for debugging)
export const GET = withRequest(async function GET() {
  const start = Date.now();
  const perf = trackPerformance("analytics_process_status", {
    route: "/api/analytics/process",
  });

  try {
    // Simple status check
    const recentMetrics = await prisma.productMetrics.count({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    const totalBehaviorEvents = await prisma.userBehavior.count();
    const totalOrders = await prisma.order.count();

    perf.finish("ok");
    return NextResponse.json({
      status: "operational",
      metrics: {
        recentMetricsUpdates: recentMetrics,
        totalBehaviorEvents,
        totalOrders,
      },
      lastProcessed: new Date().toISOString(),
      request_duration_ms: Date.now() - start,
    });
  } catch (error) {
    perf.finish("error");
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        request_duration_ms: Date.now() - start,
      },
      { status: 500 }
    );
  }
});
