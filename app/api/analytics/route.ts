import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { withRequest } from "@/lib/server/logger";
import { captureError, trackPerformance } from "@/lib/server/errors";

// GET /api/analytics - Advanced analytics data for admin dashboard
export const GET = withRequest(async function GET(req: NextRequest) {
  const start = Date.now();
  const perf = trackPerformance("analytics_endpoint", {
    route: "/api/analytics",
  });

  try {
    // Check authentication and admin authorization
    const session = await getServerSession(authOptionsEnhanced);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d"; // 7d, 30d, 90d, 1y
    const includeRealtime = searchParams.get("realtime") === "true";

    // Calculate date range based on period
    const now = new Date();
    const dateRanges = {
      "7d": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      "90d": new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      "1y": new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    };
    const startDate =
      dateRanges[period as keyof typeof dateRanges] || dateRanges["30d"];

    // Execute parallel analytics queries
    const [
      userAnalytics,
      productAnalytics,
      revenueAnalytics,
      conversionAnalytics,
      searchAnalytics,
      categoryAnalytics,
      cohortData,
      realtimeData,
    ] = await Promise.all([
      // User Analytics
      getUserAnalytics(startDate),

      // Product Analytics
      getProductAnalytics(startDate),

      // Revenue Analytics
      getRevenueAnalytics(startDate),

      // Conversion Analytics
      getConversionAnalytics(startDate),

      // Search Analytics
      getSearchAnalytics(startDate),

      // Category Analytics
      getCategoryAnalytics(startDate),

      // Cohort Analysis
      getCohortAnalysis(startDate),

      // Realtime data (if requested)
      includeRealtime ? getRealtimeAnalytics() : null,
    ]);

    const response = {
      timestamp: new Date().toISOString(),
      period,
      request_duration_ms: Date.now() - start,
      analytics: {
        user: userAnalytics,
        product: productAnalytics,
        revenue: revenueAnalytics,
        conversion: conversionAnalytics,
        search: searchAnalytics,
        category: categoryAnalytics,
        cohort: cohortData,
        ...(realtimeData && { realtime: realtimeData }),
      },
    };

    perf.finish("ok");
    return NextResponse.json(response);
  } catch {
    perf.finish("error");
    captureError(new Error("Analytics API failed"), {
      route: "/api/analytics",
    });
    return NextResponse.json(
      {
        error: "analytics_unavailable",
        message: "Analytics are temporarily unavailable",
        request_duration_ms: Date.now() - start,
      },
      { status: 500 }
    );
  }
});

// User Analytics Functions
async function getUserAnalytics(startDate: Date) {
  const [userStats, sessionStats, behaviorStats, segmentStats] =
    await Promise.all([
      // Basic user metrics
      prisma.user.aggregate({
        where: {
          createdAt: { gte: startDate },
          isAdmin: false,
        },
        _count: { _all: true },
      }),

      // Session analytics from UserSession model
      prisma.userSession.groupBy({
        by: ["deviceType", "browser"],
        where: { startTime: { gte: startDate } },
        _count: { _all: true },
        _avg: { duration: true },
      }),

      // Behavior patterns
      prisma.userBehavior.groupBy({
        by: ["eventType"],
        where: { timestamp: { gte: startDate } },
        _count: { _all: true },
      }),

      // Customer segments
      prisma.customerSegment.findMany({
        include: {
          _count: {
            select: { users: true },
          },
        },
      }),
    ]);

  return {
    newUsers: userStats._count,
    sessions: {
      byDevice: sessionStats.reduce((acc, stat) => {
        acc[stat.deviceType || "unknown"] = stat._count._all;
        return acc;
      }, {} as Record<string, number>),
      byBrowser: sessionStats.reduce((acc, stat) => {
        acc[stat.browser || "unknown"] = stat._count._all;
        return acc;
      }, {} as Record<string, number>),
      averageDuration:
        sessionStats.reduce((sum, stat) => sum + (stat._avg.duration || 0), 0) /
        (sessionStats.length || 1),
    },
    behavior: {
      byEventType: behaviorStats.reduce((acc, stat) => {
        acc[stat.eventType] = stat._count._all;
        return acc;
      }, {} as Record<string, number>),
    },
    segments: segmentStats.map((segment) => ({
      name: segment.name,
      userCount: segment._count.users,
      criteria: segment.criteria,
    })),
  };
}

// Product Analytics Functions
async function getProductAnalytics(startDate: Date) {
  const [productMetrics, productAnalytics, topProducts] = await Promise.all([
    // Product metrics from existing ProductMetrics model
    prisma.productMetrics.findMany({
      where: { updatedAt: { gte: startDate } },
      include: {
        product: {
          select: { name: true, brand: { select: { name: true } } },
        },
      },
      orderBy: { views: "desc" },
      take: 20,
    }),

    // Product analytics from new ProductAnalytics model
    prisma.productAnalytics.findMany({
      where: { updatedAt: { gte: startDate } },
      include: {
        product: {
          select: { name: true, brand: { select: { name: true } } },
        },
      },
      orderBy: { conversionRate: "desc" },
      take: 10,
    }),

    // Top performing products by revenue
    prisma.$queryRaw<
      Array<{
        product_id: string;
        product_name: string;
        brand_name: string;
        total_revenue: bigint;
        total_quantity: bigint;
      }>
    >`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        b.name as brand_name,
        COALESCE(SUM(oi."priceCents" * oi.quantity), 0) as total_revenue,
        COALESCE(SUM(oi.quantity), 0) as total_quantity
      FROM "Product" p
      LEFT JOIN "Brand" b ON p."brandId" = b.id
      LEFT JOIN "OrderItem" oi ON p.id = oi."productId"
      LEFT JOIN "Order" o ON oi."orderId" = o.id
      WHERE o.status = 'COMPLETED' AND o."createdAt" >= ${startDate}
      GROUP BY p.id, p.name, b.name
      ORDER BY total_revenue DESC
      LIMIT 15
    `,
  ]);

  return {
    topViewedProducts: productMetrics.map((pm) => ({
      productId: pm.productId,
      productName: pm.product.name,
      brandName: pm.product.brand?.name || "Unknown",
      views: pm.views,
      purchases: pm.purchases,
      conversionRate: pm.views > 0 ? (pm.purchases / pm.views) * 100 : 0,
    })),
    topConvertingProducts: productAnalytics.map((pa) => ({
      productId: pa.productId,
      productName: pa.product.name,
      brandName: pa.product.brand?.name || "Unknown",
      conversionRate: pa.conversionRate,
      revenue: pa.purchaseCount || 0, // Use purchase count as proxy
      impressions: pa.viewCount || 0,
    })),
    topRevenueProducts: topProducts.map((tp) => ({
      productId: tp.product_id,
      productName: tp.product_name,
      brandName: tp.brand_name || "Unknown",
      revenue: Number(tp.total_revenue) / 100,
      quantity: Number(tp.total_quantity),
    })),
  };
}

// Revenue Analytics Functions
async function getRevenueAnalytics(startDate: Date) {
  const [revenueByDay, revenueAnalytics, orderStats] = await Promise.all([
    // Daily revenue breakdown
    prisma.$queryRaw<
      Array<{
        date: Date;
        revenue: bigint;
        order_count: bigint;
      }>
    >`
      SELECT 
        DATE_TRUNC('day', o."createdAt") as date,
        SUM(o."totalCents") as revenue,
        COUNT(o.id) as order_count
      FROM "Order" o
      WHERE o.status = 'COMPLETED' AND o."createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('day', o."createdAt")
      ORDER BY date ASC
    `,

    // Revenue analytics from new RevenueAnalytics model
    prisma.revenueAnalytics.findMany({
      where: { date: { gte: startDate } },
      orderBy: { date: "asc" },
    }),

    // Order statistics
    prisma.order.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: { gte: startDate },
      },
      _sum: { totalCents: true, subtotalCents: true },
      _avg: { totalCents: true },
      _count: { _all: true },
    }),
  ]);

  return {
    dailyRevenue: revenueByDay.map((r) => ({
      date: r.date.toISOString().split("T")[0],
      revenue: Number(r.revenue) / 100,
      orderCount: Number(r.order_count),
    })),
    analytics: revenueAnalytics.map((ra) => ({
      date: ra.date.toISOString().split("T")[0],
      totalRevenue: ra.totalRevenue / 100,
      orderCount: ra.orderCount,
      averageOrderValue: ra.averageOrderValue / 100,
      newCustomerRevenue: ra.newCustomerRevenue / 100,
      returningCustomerRevenue: ra.returningCustomerRevenue / 100,
    })),
    summary: {
      totalRevenue: Number(orderStats._sum.totalCents || 0) / 100,
      totalOrders: orderStats._count,
      averageOrderValue: Number(orderStats._avg.totalCents || 0) / 100,
    },
  };
}

// Conversion Analytics Functions
async function getConversionAnalytics(startDate: Date) {
  const [conversionFunnels, pageViews, events] = await Promise.all([
    // Conversion funnels
    prisma.conversionFunnel.findMany({
      where: { updatedAt: { gte: startDate } },
      orderBy: { conversionRate: "desc" },
    }),

    // Page view analytics
    prisma.pageView.groupBy({
      by: ["path"],
      where: { timestamp: { gte: startDate } },
      _count: { _all: true },
      _avg: { duration: true },
    }),

    // Analytics events
    prisma.analyticsEvent.groupBy({
      by: ["eventType"],
      where: { timestamp: { gte: startDate } },
      _count: { _all: true },
    }),
  ]);

  return {
    funnels: conversionFunnels.map((cf) => ({
      id: cf.id,
      name: cf.name,
      totalUsers: cf.totalUsers,
      completedUsers: cf.completedUsers,
      conversionRate: cf.conversionRate,
      steps: JSON.parse(cf.steps || "[]"),
      dropoffData: JSON.parse(cf.dropoffData || "{}"),
    })),
    pageViews: {
      byPath: pageViews.reduce((acc, pv) => {
        acc[pv.path] = {
          views: pv._count._all,
          avgTimeOnPage: pv._avg.duration || 0,
        };
        return acc;
      }, {} as Record<string, { views: number; avgTimeOnPage: number }>),
    },
    events: {
      byType: events.reduce((acc, event) => {
        acc[event.eventType] = event._count._all;
        return acc;
      }, {} as Record<string, number>),
    },
  };
}

// Search Analytics Functions
async function getSearchAnalytics(startDate: Date) {
  const [searchAnalytics, topQueries] = await Promise.all([
    // Search analytics from new SearchAnalytics model
    prisma.searchAnalytics.findMany({
      where: { lastSearched: { gte: startDate } },
      orderBy: { lastSearched: "desc" },
    }),

    // Top search queries
    prisma.$queryRaw<
      Array<{
        search_query: string;
        search_count: bigint;
        results_count: number;
      }>
    >`
      SELECT 
        LOWER(TRIM(ae.properties->>'query')) as search_query,
        COUNT(*) as search_count,
        AVG((ae.properties->>'resultCount')::int) as results_count
      FROM "AnalyticsEvent" ae
      WHERE ae."eventType" = 'SEARCH' 
        AND ae.timestamp >= ${startDate}
        AND ae.properties->>'query' IS NOT NULL
      GROUP BY LOWER(TRIM(ae.properties->>'query'))
      HAVING COUNT(*) > 1
      ORDER BY search_count DESC
      LIMIT 20
    `,
  ]);

  return {
    analytics: searchAnalytics.map((sa) => ({
      date: sa.lastSearched.toISOString().split("T")[0],
      totalSearches: sa.searchVolume,
      uniqueQueries: 1, // Each record represents unique query
      noResultsRate: sa.noResultsCount / sa.searchVolume,
      clickThroughRate: sa.clickThroughRate,
      averageResultsPerQuery: sa.resultCount,
    })),
    topQueries: topQueries.map((tq) => ({
      query: tq.search_query,
      count: Number(tq.search_count),
      avgResults: Number(tq.results_count) || 0,
    })),
  };
}

// Category Analytics Functions
async function getCategoryAnalytics(startDate: Date) {
  const [categoryAnalytics, categoryRevenue] = await Promise.all([
    // Category analytics from new CategoryAnalytics model
    prisma.categoryAnalytics.findMany({
      include: {
        category: { select: { name: true } },
      },
      where: { updatedAt: { gte: startDate } },
      orderBy: { averageOrderValue: "desc" },
    }),

    // Category revenue breakdown
    prisma.$queryRaw<
      Array<{
        category_id: string;
        category_name: string;
        total_revenue: bigint;
        order_count: bigint;
        product_count: bigint;
      }>
    >`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        COALESCE(SUM(oi."priceCents" * oi.quantity), 0) as total_revenue,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT p.id) as product_count
      FROM "Category" c
      LEFT JOIN "Product" p ON c.id = p."categoryId"
      LEFT JOIN "OrderItem" oi ON p.id = oi."productId"
      LEFT JOIN "Order" o ON oi."orderId" = o.id AND o.status = 'COMPLETED'
      WHERE o."createdAt" >= ${startDate} OR o."createdAt" IS NULL
      GROUP BY c.id, c.name
      ORDER BY total_revenue DESC
    `,
  ]);

  return {
    analytics: categoryAnalytics.map((ca) => ({
      categoryId: ca.categoryId,
      categoryName: ca.category.name,
      totalRevenue: ca.averageOrderValue / 100,
      productViews: ca.viewCount,
      conversionRate: ca.conversionRate,
      averageOrderValue: ca.averageOrderValue / 100,
    })),
    revenue: categoryRevenue.map((cr) => ({
      categoryId: cr.category_id,
      categoryName: cr.category_name,
      revenue: Number(cr.total_revenue) / 100,
      orderCount: Number(cr.order_count),
      productCount: Number(cr.product_count),
    })),
  };
}

// Cohort Analysis Functions
async function getCohortAnalysis(startDate: Date) {
  const cohortData = await prisma.cohortAnalysis.findMany({
    where: { cohortDate: { gte: startDate } },
    orderBy: { cohortDate: "desc" },
  });

  return cohortData.map((cd) => ({
    cohortMonth: cd.cohortDate.toISOString().split("T")[0],
    cohortSize: cd.cohortSize,
    retentionRates: JSON.parse(cd.retentionData || "[]"),
    revenueData: JSON.parse(cd.revenueData || "{}"),
  }));
}

// Realtime Analytics Functions
async function getRealtimeAnalytics() {
  const now = new Date();
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [activeUsers, recentEvents, recentOrders] = await Promise.all([
    // Active users in last hour
    prisma.userSession.count({
      where: {
        OR: [
          { endTime: null }, // Still active
          { endTime: { gte: lastHour } },
        ],
      },
    }),

    // Recent events
    prisma.analyticsEvent.count({
      where: { timestamp: { gte: lastHour } },
    }),

    // Recent orders
    prisma.order.count({
      where: {
        createdAt: { gte: last24Hours },
        status: "COMPLETED",
      },
    }),
  ]);

  return {
    activeUsers,
    eventsLastHour: recentEvents,
    ordersLast24h: recentOrders,
    timestamp: now.toISOString(),
  };
}
