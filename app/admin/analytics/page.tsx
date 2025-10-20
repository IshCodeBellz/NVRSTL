import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import AnalyticsDashboard from "@/components/admin/analytics/AnalyticsDashboard";

import { RefreshCw } from "lucide-react";

async function getBasicAnalytics() {
  try {
    // Use existing models to get basic analytics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [userStats, orderStats, productMetrics, behaviorStats, revenueData] =
      await Promise.all([
        // User analytics
        prisma.user.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            isAdmin: false,
          },
        }),

        // Order analytics
        prisma.order.aggregate({
          where: {
            status: "COMPLETED",
            createdAt: { gte: thirtyDaysAgo },
          },
          _sum: { totalCents: true },
          _avg: { totalCents: true },
          _count: { _all: true },
        }),

        // Product metrics
        prisma.productMetrics.findMany({
          take: 20,
          orderBy: { views: "desc" },
          include: {
            product: {
              select: {
                name: true,
                brand: { select: { name: true } },
              },
            },
          },
        }),

        // Behavior stats
        prisma.userBehavior.groupBy({
          by: ["eventType"],
          where: { timestamp: { gte: thirtyDaysAgo } },
          _count: { _all: true },
        }),

        // Revenue by day
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
        WHERE o.status = 'COMPLETED' 
          AND o."createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE_TRUNC('day', o."createdAt")
        ORDER BY date ASC
      `,
      ]);

    // Transform data for the dashboard
    const analyticsData = {
      user: {
        newUsers: userStats,
        sessions: {
          byDevice: { Desktop: 60, Mobile: 35, Tablet: 5 }, // Mock data
          byBrowser: { Chrome: 50, Safari: 25, Firefox: 15, Edge: 10 }, // Mock data
          averageDuration: 300, // Mock data
        },
        behavior: {
          byEventType: behaviorStats.reduce((acc, stat) => {
            acc[stat.eventType] = stat._count._all;
            return acc;
          }, {} as Record<string, number>),
        },
        segments: [
          { name: "VIP", userCount: 10, criteria: {} },
          { name: "Loyal", userCount: 25, criteria: {} },
          { name: "Regular", userCount: 45, criteria: {} },
          { name: "New", userCount: userStats, criteria: {} },
        ],
      },
      product: {
        topViewedProducts: productMetrics.map((pm) => ({
          productId: pm.productId,
          productName: pm.product.name,
          brandName: pm.product.brand?.name || "Unknown",
          views: pm.views,
          purchases: pm.purchases,
          conversionRate: pm.views > 0 ? (pm.purchases / pm.views) * 100 : 0,
        })),
        topConvertingProducts: productMetrics
          .filter((pm) => pm.views > 0)
          .sort((a, b) => b.purchases / b.views - a.purchases / a.views)
          .slice(0, 10)
          .map((pm) => ({
            productId: pm.productId,
            productName: pm.product.name,
            brandName: pm.product.brand?.name || "Unknown",
            conversionRate: (pm.purchases / pm.views) * 100,
            revenue: pm.purchases * 5000, // Mock average price
            impressions: pm.views,
          })),
        topRevenueProducts: [], // Would need order item data
      },
      revenue: {
        dailyRevenue: revenueData.map((r) => ({
          date: r.date.toISOString().split("T")[0],
          revenue: Number(r.revenue) / 100,
          orderCount: Number(r.order_count),
        })),
        summary: {
          totalRevenue: Number(orderStats._sum.totalCents || 0) / 100,
          totalOrders: orderStats._count._all,
          averageOrderValue: Number(orderStats._avg.totalCents || 0) / 100,
        },
      },
      conversion: {
        funnels: [
          {
            step: 1,
            stepName: "Landing",
            users: 1000,
            conversionRate: 100,
            dropoffRate: 0,
          },
          {
            step: 2,
            stepName: "Product View",
            users: 800,
            conversionRate: 80,
            dropoffRate: 20,
          },
          {
            step: 3,
            stepName: "Add to Cart",
            users: 200,
            conversionRate: 25,
            dropoffRate: 75,
          },
          {
            step: 4,
            stepName: "Checkout",
            users: 100,
            conversionRate: 50,
            dropoffRate: 50,
          },
          {
            step: 5,
            stepName: "Purchase",
            users: 80,
            conversionRate: 80,
            dropoffRate: 20,
          },
        ],
        pageViews: {
          byPath: {
            "/": { views: 1000, avgTimeOnPage: 30 },
            "/products": { views: 800, avgTimeOnPage: 45 },
            "/bag": { views: 200, avgTimeOnPage: 60 },
            "/checkout": { views: 100, avgTimeOnPage: 120 },
          },
        },
      },
      search: {
        topQueries: [
          { query: "dress", count: 150, avgResults: 25 },
          { query: "shoes", count: 120, avgResults: 30 },
          { query: "jacket", count: 80, avgResults: 15 },
        ],
      },
      category: {
        revenue: [], // Would need category revenue data
      },
    };

    return analyticsData;
  } catch {
    return null;
  }
}

export const revalidate = 60;

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptionsEnhanced);

  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    redirect("/");
  }

  const analyticsData = await getBasicAnalytics();

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading analytics...</p>
            </div>
          </div>
        }
      >
        {analyticsData ? (
          <AnalyticsDashboard initialData={analyticsData} />
        ) : (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Analytics Dashboard</h2>
            <p className="text-center text-gray-500">
              Unable to load analytics data. Please check back later.
            </p>
          </div>
        )}
      </Suspense>
    </div>
  );
}
