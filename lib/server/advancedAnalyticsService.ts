// Advanced Analytics Service - Comprehensive data models for deeper insights
import { prisma } from "@/lib/server/prisma";
import { cache } from "react";

export interface AdvancedAnalyticsData {
  // Customer Insights
  customerSegments: CustomerSegment[];
  customerLifetimeValue: CLVData[];
  cohortAnalysis: CohortData[];
  churnPrediction: ChurnData[];

  // Product Intelligence
  productPerformance: ProductPerformanceData[];
  categoryInsights: CategoryInsights[];
  crossSellOpportunities: CrossSellData[];
  seasonalTrends: SeasonalData[];

  // Revenue Analytics
  revenueBreakdown: RevenueBreakdown;
  marginAnalysis: MarginData[];
  discountEffectiveness: DiscountAnalysis[];

  // Operational Insights
  conversionFunnels: ConversionFunnel[];
  abandonmentAnalysis: AbandonmentData[];
  searchAnalytics: SearchInsights;
  performanceMetrics: PerformanceMetrics;
}

export interface CustomerSegment {
  segment: string;
  userCount: number;
  averageOrderValue: number;
  purchaseFrequency: number;
  lifetimeValue: number;
  characteristics: string[];
}

export interface CLVData {
  userId: string;
  customerEmail: string;
  registrationDate: Date;
  totalOrders: number;
  totalSpent: number;
  predictedLTV: number;
  lastOrderDate: Date | null;
  daysSinceLastOrder: number;
  segment: string;
}

export interface CohortData {
  cohortMonth: string;
  cohortSize: number;
  periods: Array<{
    period: number;
    customers: number;
    retentionRate: number;
    revenue: number;
  }>;
}

export interface ChurnData {
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  userCount: number;
  indicators: string[];
  recommendedActions: string[];
}

export interface ProductPerformanceData {
  productId: string;
  productName: string;
  brandName: string;
  categoryName: string;
  views: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  profit: number;
  marginPercent: number;
  inventoryTurns: number;
  returnRate: number;
  reviewScore: number;
  trendScore: number;
}

export interface CategoryInsights {
  categoryId: string;
  categoryName: string;
  totalRevenue: number;
  productCount: number;
  averageOrderValue: number;
  topPerformingProducts: string[];
  growthRate: number;
  seasonalityIndex: number;
}

export interface CrossSellData {
  primaryProductId: string;
  primaryProductName: string;
  suggestedProductId: string;
  suggestedProductName: string;
  confidence: number;
  frequency: number;
  revenueImpact: number;
}

export interface SeasonalData {
  period: string;
  categoryId: string;
  categoryName: string;
  salesVolume: number;
  revenueChange: number;
  yearOverYearGrowth: number;
}

export interface RevenueBreakdown {
  totalRevenue: number;
  revenueByChannel: Array<{
    channel: string;
    revenue: number;
    percentage: number;
  }>;
  revenueByCategory: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  revenueByRegion: Array<{
    region: string;
    revenue: number;
    percentage: number;
  }>;
  revenueGrowth: Array<{ period: string; revenue: number; growth: number }>;
}

export interface MarginData {
  productId: string;
  productName: string;
  costPrice: number;
  sellingPrice: number;
  grossMargin: number;
  marginPercent: number;
  volumeSold: number;
  totalProfit: number;
}

export interface DiscountAnalysis {
  discountType: string;
  discountValue: number;
  usageCount: number;
  revenueImpact: number;
  newCustomerAcquisition: number;
  averageOrderIncrease: number;
  profitabilityIndex: number;
}

export interface ConversionFunnel {
  stage: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
  averageTimeSpent: number;
}

export interface AbandonmentData {
  stage: "BROWSE" | "CART" | "CHECKOUT";
  abandonmentRate: number;
  reasons: Array<{ reason: string; percentage: number }>;
  recoveryOpportunities: number;
  estimatedLostRevenue: number;
}

export interface SearchInsights {
  totalSearches: number;
  uniqueQueries: number;
  noResultsRate: number;
  clickThroughRate: number;
  topQueries: Array<{ query: string; count: number; conversionRate: number }>;
  trending: Array<{ query: string; growthRate: number }>;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  serverResponseTime: number;
  errorRate: number;
  uptime: number;
  apiLatency: number;
  databaseQueryTime: number;
}

// Raw database query result types
interface CustomerSegmentRaw {
  segment: string;
  user_count: bigint;
  avg_order_value: number;
  avg_purchase_frequency: number;
  avg_lifetime_value: number;
}

interface CLVDataRaw {
  id: string;
  email: string;
  registration_date: Date;
  total_orders: bigint;
  total_spent: bigint;
  predicted_ltv: number;
  last_order_date: Date | null;
  days_since_last_order: number | null;
  segment: string;
}

interface CohortDataRaw {
  cohort_month: Date;
  cohort_size: bigint;
  period_number: number;
  customers: bigint;
  revenue: bigint;
  retention_rate: number;
}

interface ProductPerformanceRaw {
  product_id: string;
  product_name: string;
  brand_name: string | null;
  category_name: string | null;
  views: bigint;
  conversions: bigint;
  conversion_rate: number;
  revenue: bigint;
  estimated_profit: bigint;
  margin_percent: number;
  inventory_turns: bigint;
  return_rate: number;
  review_score: number;
  trend_score: bigint;
}

interface CategoryInsightsRaw {
  category_id: string;
  category_name: string;
  product_count: bigint;
  total_revenue: bigint;
  avg_order_value: bigint;
  total_views: bigint;
  conversion_value: number;
}

interface ConversionFunnelRaw {
  stage: string;
  users: bigint;
  average_time_spent: number;
}

interface RevenueByCategoryRaw {
  category: string;
  revenue: bigint;
}

interface RevenueGrowthRaw {
  period: Date;
  revenue: bigint;
}

export class AdvancedAnalyticsService {
  // Customer Insights
  static getCustomerSegmentation = cache(
    async (): Promise<CustomerSegment[]> => {
      const segments = await prisma.$queryRaw<CustomerSegmentRaw[]>`
      WITH customer_stats AS (
        SELECT 
          u.id,
          u.email,
          u."createdAt",
          COUNT(o.id) as order_count,
          COALESCE(SUM(o."totalCents"), 0) as total_spent,
          MAX(o."createdAt") as last_order_date,
          EXTRACT(DAYS FROM (NOW() - MAX(o."createdAt"))) as days_since_last_order
        FROM "User" u
        LEFT JOIN "Order" o ON u.id = o."userId"
        WHERE u."isAdmin" = false
        GROUP BY u.id, u.email, u."createdAt"
      ),
      segmented_customers AS (
        SELECT *,
          CASE 
            WHEN order_count >= 5 AND total_spent >= 50000 THEN 'VIP'
            WHEN order_count >= 3 AND total_spent >= 25000 THEN 'LOYAL'
            WHEN order_count >= 1 AND total_spent >= 10000 THEN 'REGULAR'
            WHEN order_count >= 1 THEN 'NEW_BUYER'
            ELSE 'BROWSER'
          END as segment
        FROM customer_stats
      )
      SELECT 
        segment,
        COUNT(*) as user_count,
        AVG(CASE WHEN order_count > 0 THEN total_spent / order_count ELSE 0 END) as avg_order_value,
        AVG(order_count) as avg_purchase_frequency,
        AVG(total_spent) as avg_lifetime_value
      FROM segmented_customers
      GROUP BY segment
      ORDER BY avg_lifetime_value DESC
    `;

      return segments.map((s) => ({
        segment: s.segment,
        userCount: Number(s.user_count),
        averageOrderValue: Number(s.avg_order_value) / 100, // Convert cents to dollars
        purchaseFrequency: Number(s.avg_purchase_frequency),
        lifetimeValue: Number(s.avg_lifetime_value) / 100,
        characteristics: this.getSegmentCharacteristics(s.segment),
      }));
    }
  );

  static getCustomerLifetimeValue = cache(
    async (limit = 100): Promise<CLVData[]> => {
      const clvData = await prisma.$queryRaw<CLVDataRaw[]>`
      WITH customer_metrics AS (
        SELECT 
          u.id,
          u.email,
          u."createdAt" as registration_date,
          COUNT(o.id) as total_orders,
          COALESCE(SUM(o."totalCents"), 0) as total_spent,
          MAX(o."createdAt") as last_order_date,
          EXTRACT(DAYS FROM (NOW() - MAX(o."createdAt"))) as days_since_last_order,
          CASE 
            WHEN COUNT(o.id) >= 5 AND SUM(o."totalCents") >= 50000 THEN 'VIP'
            WHEN COUNT(o.id) >= 3 AND SUM(o."totalCents") >= 25000 THEN 'LOYAL'
            WHEN COUNT(o.id) >= 1 AND SUM(o."totalCents") >= 10000 THEN 'REGULAR'
            WHEN COUNT(o.id) >= 1 THEN 'NEW_BUYER'
            ELSE 'BROWSER'
          END as segment
        FROM "User" u
        LEFT JOIN "Order" o ON u.id = o."userId"
        WHERE u."isAdmin" = false
        GROUP BY u.id, u.email, u."createdAt"
      )
      SELECT *,
        -- Simple CLV prediction based on historical data
        CASE 
          WHEN total_orders > 0 THEN 
            (total_spent * 1.2) + (total_orders * 2000) -- Basic formula
          ELSE 0 
        END as predicted_ltv
      FROM customer_metrics
      ORDER BY total_spent DESC
      LIMIT ${limit}
    `;

      return clvData.map((c) => ({
        userId: c.id,
        customerEmail: c.email,
        registrationDate: c.registration_date,
        totalOrders: Number(c.total_orders),
        totalSpent: Number(c.total_spent) / 100,
        predictedLTV: Number(c.predicted_ltv) / 100,
        lastOrderDate: c.last_order_date,
        daysSinceLastOrder: Number(c.days_since_last_order) || 0,
        segment: c.segment,
      }));
    }
  );

  static getCohortAnalysis = cache(async (): Promise<CohortData[]> => {
    const cohorts = await prisma.$queryRaw<CohortDataRaw[]>`
      WITH monthly_cohorts AS (
        SELECT 
          u.id,
          DATE_TRUNC('month', u."createdAt") as cohort_month,
          DATE_TRUNC('month', o."createdAt") as order_month,
          o."totalCents"
        FROM "User" u
        LEFT JOIN "Order" o ON u.id = o."userId"
        WHERE u."isAdmin" = false
      ),
      cohort_data AS (
        SELECT 
          cohort_month,
          COUNT(DISTINCT id) as cohort_size,
          EXTRACT(MONTH FROM AGE(order_month, cohort_month)) as period_number,
          COUNT(DISTINCT CASE WHEN order_month IS NOT NULL THEN id END) as customers,
          SUM(COALESCE("totalCents", 0)) as revenue
        FROM monthly_cohorts
        WHERE cohort_month >= NOW() - INTERVAL '12 months'
        GROUP BY cohort_month, period_number
      )
      SELECT 
        cohort_month,
        cohort_size,
        period_number,
        customers,
        revenue,
        ROUND(customers::decimal / cohort_size * 100, 2) as retention_rate
      FROM cohort_data
      WHERE period_number IS NOT NULL
      ORDER BY cohort_month DESC, period_number ASC
    `;

    // Group by cohort month
    const cohortMap = new Map<
      string,
      {
        cohortMonth: string;
        cohortSize: number;
        periods: Array<{
          period: number;
          customers: number;
          retentionRate: number;
          revenue: number;
        }>;
      }
    >();

    cohorts.forEach((row) => {
      const monthKey = row.cohort_month.toISOString().substring(0, 7);

      if (!cohortMap.has(monthKey)) {
        cohortMap.set(monthKey, {
          cohortMonth: monthKey,
          cohortSize: Number(row.cohort_size),
          periods: [],
        });
      }

      cohortMap.get(monthKey)!.periods.push({
        period: Number(row.period_number),
        customers: Number(row.customers),
        retentionRate: Number(row.retention_rate),
        revenue: Number(row.revenue) / 100,
      });
    });

    return Array.from(cohortMap.values());
  });

  // Product Intelligence
  static getProductPerformance = cache(
    async (limit = 50): Promise<ProductPerformanceData[]> => {
      const performance = await prisma.$queryRaw<ProductPerformanceRaw[]>`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        b.name as brand_name,
        c.name as category_name,
        COALESCE(pm.views, 0) as views,
        COALESCE(pm.purchases, 0) as conversions,
        CASE 
          WHEN COALESCE(pm.views, 0) > 0 
          THEN ROUND(COALESCE(pm.purchases, 0)::decimal / pm.views * 100, 2)
          ELSE 0 
        END as conversion_rate,
        COALESCE(revenue.total_revenue, 0) as revenue,
        COALESCE(revenue.total_revenue * 0.3, 0) as estimated_profit, -- Assume 30% margin
        30.0 as margin_percent, -- Default margin
        COALESCE(pm.purchases, 0) as inventory_turns,
        0.0 as return_rate, -- Placeholder
        COALESCE(ra."averageRating", 0) as review_score,
        COALESCE(pm.views, 0) + COALESCE(pm.purchases, 0) * 10 as trend_score
      FROM "Product" p
      LEFT JOIN "Brand" b ON p."brandId" = b.id
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      LEFT JOIN "ProductMetrics" pm ON p.id = pm."productId"
      LEFT JOIN "ReviewAnalytics" ra ON p.id = ra."productId"
      LEFT JOIN (
        SELECT 
          oi."productId",
          SUM(oi."priceCents" * oi.quantity) as total_revenue
        FROM "OrderItem" oi
        INNER JOIN "Order" o ON oi."orderId" = o.id
        WHERE o.status = 'COMPLETED'
        GROUP BY oi."productId"
      ) revenue ON p.id = revenue."productId"
      WHERE p."isActive" = true
      ORDER BY trend_score DESC
      LIMIT ${limit}
    `;

      return performance.map((p) => ({
        productId: p.product_id,
        productName: p.product_name,
        brandName: p.brand_name || "Unknown",
        categoryName: p.category_name || "Unknown",
        views: Number(p.views),
        conversions: Number(p.conversions),
        conversionRate: Number(p.conversion_rate),
        revenue: Number(p.revenue) / 100,
        profit: Number(p.estimated_profit) / 100,
        marginPercent: Number(p.margin_percent),
        inventoryTurns: Number(p.inventory_turns),
        returnRate: Number(p.return_rate),
        reviewScore: Number(p.review_score),
        trendScore: Number(p.trend_score),
      }));
    }
  );

  static getCategoryInsights = cache(async (): Promise<CategoryInsights[]> => {
    const insights = await prisma.$queryRaw<CategoryInsightsRaw[]>`
      WITH category_metrics AS (
        SELECT 
          c.id as category_id,
          c.name as category_name,
          COUNT(DISTINCT p.id) as product_count,
          COALESCE(SUM(revenue.total_revenue), 0) as total_revenue,
          COALESCE(AVG(orders.avg_order_value), 0) as avg_order_value,
          COALESCE(SUM(pm.views), 0) as total_views
        FROM "Category" c
        LEFT JOIN "Product" p ON c.id = p."categoryId" AND p."isActive" = true
        LEFT JOIN "ProductMetrics" pm ON p.id = pm."productId"
        LEFT JOIN (
          SELECT 
            p2."categoryId",
            SUM(oi."priceCents" * oi.quantity) as total_revenue
          FROM "OrderItem" oi
          INNER JOIN "Product" p2 ON oi."productId" = p2.id
          INNER JOIN "Order" o ON oi."orderId" = o.id
          WHERE o.status = 'COMPLETED'
          GROUP BY p2."categoryId"
        ) revenue ON c.id = revenue."categoryId"
        LEFT JOIN (
          SELECT 
            p3."categoryId",
            AVG(o2."totalCents") as avg_order_value
          FROM "Order" o2
          INNER JOIN "OrderItem" oi2 ON o2.id = oi2."orderId"
          INNER JOIN "Product" p3 ON oi2."productId" = p3.id
          WHERE o2.status = 'COMPLETED'
          GROUP BY p3."categoryId"
        ) orders ON c.id = orders."categoryId"
        GROUP BY c.id, c.name
      )
      SELECT *,
        ROUND(total_revenue / NULLIF(total_views, 0) * 100, 2) as conversion_value
      FROM category_metrics
      WHERE product_count > 0
      ORDER BY total_revenue DESC
    `;

    return insights.map((i) => ({
      categoryId: i.category_id,
      categoryName: i.category_name,
      totalRevenue: Number(i.total_revenue) / 100,
      productCount: Number(i.product_count),
      averageOrderValue: Number(i.avg_order_value) / 100,
      topPerformingProducts: [], // Would need additional query
      growthRate: 0, // Would need historical comparison
      seasonalityIndex: 1.0, // Placeholder
    }));
  });

  // Revenue Analytics
  static getRevenueBreakdown = cache(async (): Promise<RevenueBreakdown> => {
    const [totalRevenue, revenueByCategory, revenueGrowth] = await Promise.all([
      prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COALESCE(SUM(o."totalCents"), 0) as total
        FROM "Order" o 
        WHERE o.status = 'COMPLETED'
      `,
      prisma.$queryRaw<RevenueByCategoryRaw[]>`
        SELECT 
          c.name as category,
          COALESCE(SUM(oi."priceCents" * oi.quantity), 0) as revenue
        FROM "Category" c
        LEFT JOIN "Product" p ON c.id = p."categoryId"
        LEFT JOIN "OrderItem" oi ON p.id = oi."productId"
        LEFT JOIN "Order" o ON oi."orderId" = o.id AND o.status = 'COMPLETED'
        GROUP BY c.id, c.name
        ORDER BY revenue DESC
      `,
      prisma.$queryRaw<RevenueGrowthRaw[]>`
        SELECT 
          DATE_TRUNC('month', o."createdAt") as period,
          SUM(o."totalCents") as revenue
        FROM "Order" o 
        WHERE o.status = 'COMPLETED' 
          AND o."createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', o."createdAt")
        ORDER BY period ASC
      `,
    ]);

    const total = Number(totalRevenue[0]?.total || 0) / 100;

    return {
      totalRevenue: total,
      revenueByChannel: [{ channel: "Web", revenue: total, percentage: 100 }],
      revenueByCategory: revenueByCategory.map((r) => ({
        category: r.category,
        revenue: Number(r.revenue) / 100,
        percentage: total > 0 ? (Number(r.revenue) / 100 / total) * 100 : 0,
      })),
      revenueByRegion: [{ region: "Global", revenue: total, percentage: 100 }],
      revenueGrowth: revenueGrowth.map((r, index) => ({
        period: r.period.toISOString().substring(0, 7),
        revenue: Number(r.revenue) / 100,
        growth:
          index > 0
            ? ((Number(r.revenue) - Number(revenueGrowth[index - 1].revenue)) /
                Number(revenueGrowth[index - 1].revenue)) *
              100
            : 0,
      })),
    };
  });

  // Search & Conversion Analytics
  static getConversionFunnels = cache(async (): Promise<ConversionFunnel[]> => {
    const funnelData = await prisma.$queryRaw<ConversionFunnelRaw[]>`
      WITH funnel_stats AS (
        SELECT 
          'Browse' as stage,
          COUNT(DISTINCT ub."sessionId") as users,
          AVG(EXTRACT(EPOCH FROM (ub2."timestamp" - ub."timestamp"))) as avg_time
        FROM "UserBehavior" ub
        LEFT JOIN "UserBehavior" ub2 ON ub."sessionId" = ub2."sessionId" AND ub2."timestamp" > ub."timestamp"
        WHERE ub."eventType" = 'VIEW'
        
        UNION ALL
        
        SELECT 
          'Add to Cart' as stage,
          COUNT(DISTINCT ub."sessionId") as users,
          AVG(EXTRACT(EPOCH FROM (ub2."timestamp" - ub."timestamp"))) as avg_time
        FROM "UserBehavior" ub
        LEFT JOIN "UserBehavior" ub2 ON ub."sessionId" = ub2."sessionId" AND ub2."timestamp" > ub."timestamp"
        WHERE ub."eventType" = 'ADD_TO_CART'
        
        UNION ALL
        
        SELECT 
          'Purchase' as stage,
          COUNT(DISTINCT o."id") as users,
          300 as avg_time -- Estimated checkout time
        FROM "Order" o
        WHERE o.status = 'COMPLETED'
      )
      SELECT stage, users, COALESCE(avg_time, 0) as average_time_spent
      FROM funnel_stats
      ORDER BY 
        CASE stage 
          WHEN 'Browse' THEN 1 
          WHEN 'Add to Cart' THEN 2 
          WHEN 'Purchase' THEN 3 
        END
    `;

    let previousUsers = 0;
    return funnelData.map((f, index) => {
      const users = Number(f.users);
      const conversionRate =
        index === 0
          ? 100
          : previousUsers > 0
          ? (users / previousUsers) * 100
          : 0;
      const dropoffRate = 100 - conversionRate;

      const result = {
        stage: f.stage,
        users,
        conversionRate: Math.round(conversionRate * 100) / 100,
        dropoffRate: Math.round(dropoffRate * 100) / 100,
        averageTimeSpent: Number(f.average_time_spent),
      };

      previousUsers = users;
      return result;
    });
  });

  // Helper functions
  private static getSegmentCharacteristics(segment: string): string[] {
    const characteristics: Record<string, string[]> = {
      VIP: [
        "High purchase frequency",
        "High lifetime value",
        "Premium product preference",
      ],
      LOYAL: ["Regular purchaser", "Good lifetime value", "Brand advocate"],
      REGULAR: [
        "Moderate purchase frequency",
        "Price conscious",
        "Seasonal buyer",
      ],
      NEW_BUYER: ["First-time purchaser", "Needs nurturing", "Price sensitive"],
      BROWSER: ["No purchases yet", "Window shopping", "Needs engagement"],
    };

    return characteristics[segment] || ["Unknown segment"];
  }

  // Comprehensive analytics dashboard data
  static getAdvancedAnalytics = cache(
    async (): Promise<AdvancedAnalyticsData> => {
      const [
        customerSegments,
        customerLifetimeValue,
        cohortAnalysis,
        productPerformance,
        categoryInsights,
        revenueBreakdown,
        conversionFunnels,
      ] = await Promise.all([
        this.getCustomerSegmentation(),
        this.getCustomerLifetimeValue(50),
        this.getCohortAnalysis(),
        this.getProductPerformance(25),
        this.getCategoryInsights(),
        this.getRevenueBreakdown(),
        this.getConversionFunnels(),
      ]);

      return {
        customerSegments,
        customerLifetimeValue,
        cohortAnalysis,
        churnPrediction: [], // Placeholder - would need ML model
        productPerformance,
        categoryInsights,
        crossSellOpportunities: [], // Placeholder - would need association rules
        seasonalTrends: [], // Placeholder - would need historical data
        revenueBreakdown,
        marginAnalysis: [], // Placeholder - needs cost data
        discountEffectiveness: [], // Placeholder - needs discount tracking
        conversionFunnels,
        abandonmentAnalysis: [], // Placeholder - needs cart abandonment tracking
        searchAnalytics: {
          totalSearches: 0,
          uniqueQueries: 0,
          noResultsRate: 0,
          clickThroughRate: 0,
          topQueries: [],
          trending: [],
        }, // Placeholder - would integrate with search service
        performanceMetrics: {
          pageLoadTime: 0,
          serverResponseTime: 0,
          errorRate: 0,
          uptime: 100,
          apiLatency: 0,
          databaseQueryTime: 0,
        }, // Placeholder - would need monitoring integration
      };
    }
  );
}
