import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { withRequest, requireAuth } from "@/lib/server/logger";
import { trackPerformance } from "@/lib/server/errors";
import { DatabaseOptimizer } from "@/lib/server/performance/DatabaseOptimizer";
import { RedisService } from "@/lib/server/performance/RedisService";
import { connectionPool } from "@/lib/server/performance/ConnectionPool";

interface PerformanceMetrics {
  database: {
    connectionPool: {
      active: number;
      idle: number;
      total: number;
      maxConnections: number;
    };
    slowQueries: Array<{
      query: string;
      avgTime: number;
      calls: number;
      totalTime: number;
      table: string;
    }>;
    missingIndexes: Array<{
      table: string;
      columns: string[];
      type: string;
      reason: string;
      estimatedImprovement: number;
      priority: "high" | "medium" | "low";
    }>;
    tableBloat: Array<{
      table: string;
      bloatPercent: number;
      wastedBytes: number;
      recommendation: string;
    }>;
    metrics: {
      connectionPool: {
        active: number;
        idle: number;
        total: number;
        maxConnections: number;
      };
      queryPerformance: {
        avgResponseTime: number;
        slowQueries: number;
        totalQueries: number;
        cacheHitRatio: number;
      };
      tableStats: Array<{
        tableName: string;
        rowCount: number;
        sizeBytes: number;
        indexCount: number;
      }>;
    };
  };
  cache: {
    isHealthy: boolean;
    stats: {
      connected: boolean;
      usedMemory: number;
      totalKeys: number;
      hitRate: number;
      missRate: number;
    };
  };
  recommendations: Array<{
    type: "index" | "query" | "cache" | "connection";
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    action: string;
    estimatedImprovement: string;
  }>;
  summary: {
    overallScore: number;
    criticalIssues: number;
    performanceGrade: "A" | "B" | "C" | "D" | "F";
  };
}

// GET /api/admin/performance - Get comprehensive performance metrics
export const GET = withRequest(async function GET(request) {
  const perf = trackPerformance("performance_metrics", {
    route: "/api/admin/performance",
  });

  try {
    // Ensure user is authenticated and is admin
    const user = await requireAuth(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbOptimizer = DatabaseOptimizer.getInstance();
    const redisService = RedisService.getInstance();

    // Gather all performance data in parallel
    const [
      connectionPoolMetrics,
      slowQueries,
      missingIndexes,
      tableBloat,
      databaseMetrics,
      cacheStats,
    ] = await Promise.all([
      connectionPool.getMetrics(),
      dbOptimizer.getSlowQueries(20),
      dbOptimizer.getMissingIndexes(),
      dbOptimizer.getTableBloat(),
      dbOptimizer.getDatabaseMetrics(),
      redisService.getStats(),
    ]);

    // Generate recommendations based on findings
    const recommendations: PerformanceMetrics["recommendations"] = [];

    // Database connection recommendations
    if (connectionPoolMetrics.poolUtilization > 80) {
      recommendations.push({
        type: "connection",
        priority: "high",
        title: "High Database Pool Utilization",
        description: `Connection pool is ${connectionPoolMetrics.poolUtilization.toFixed(
          1
        )}% utilized`,
        action: "Increase max_connections or optimize query performance",
        estimatedImprovement: "20-30% faster response times",
      });
    }

    if (connectionPoolMetrics.queuedRequests > 0) {
      recommendations.push({
        type: "connection",
        priority: "high",
        title: "Connection Queue Buildup",
        description: `${connectionPoolMetrics.queuedRequests} requests waiting for connections`,
        action:
          "Optimize long-running queries or increase connection pool size",
        estimatedImprovement: "15-25% reduced latency",
      });
    }

    // Index recommendations
    missingIndexes.slice(0, 5).forEach((index) => {
      recommendations.push({
        type: "index",
        priority: index.priority,
        title: `Missing Index: ${index.table}`,
        description: index.reason,
        action: `CREATE INDEX ON ${index.table} (${index.columns.join(", ")})`,
        estimatedImprovement: `${index.estimatedImprovement}% faster queries`,
      });
    });

    // Slow query recommendations
    slowQueries.slice(0, 3).forEach((query) => {
      recommendations.push({
        type: "query",
        priority: query.duration > 5000 ? "high" : "medium",
        title: `Slow Query on ${query.table}`,
        description: `Query taking ${query.duration.toFixed(2)}ms on average`,
        action: query.recommendations[0] || "Optimize query or add indexes",
        estimatedImprovement:
          query.duration > 5000 ? "50-70% faster" : "20-40% faster",
      });
    });

    // Cache recommendations
    if (!redisService.isHealthy()) {
      recommendations.push({
        type: "cache",
        priority: "high",
        title: "Redis Cache Unavailable",
        description: "Cache service is not connected, affecting performance",
        action: "Check Redis connection and configuration",
        estimatedImprovement: "40-60% faster page loads",
      });
    } else if (cacheStats.hitRate < 70) {
      recommendations.push({
        type: "cache",
        priority: "medium",
        title: "Low Cache Hit Rate",
        description: `Cache hit rate is ${cacheStats.hitRate.toFixed(1)}%`,
        action: "Review caching strategy and TTL settings",
        estimatedImprovement: "20-30% faster response times",
      });
    }

    // Table bloat recommendations
    tableBloat
      .filter((table) => table.bloatPercent > 20)
      .slice(0, 3)
      .forEach((table) => {
        recommendations.push({
          type: "query",
          priority: table.bloatPercent > 50 ? "high" : "medium",
          title: `Table Bloat: ${table.table}`,
          description: `${table.bloatPercent}% bloat, wasting ${(
            table.wastedBytes /
            1024 /
            1024
          ).toFixed(1)}MB`,
          action: table.recommendation,
          estimatedImprovement: "10-20% faster queries",
        });
      });

    // Calculate overall performance score
    let score = 100;

    // Deduct points for issues
    score -= Math.min(connectionPoolMetrics.poolUtilization * 0.5, 30); // Max 30 points for high utilization
    score -= Math.min(slowQueries.length * 5, 25); // Max 25 points for slow queries
    score -= Math.min(
      missingIndexes.filter((i) => i.priority === "high").length * 10,
      20
    ); // Max 20 points for missing indexes
    score -= redisService.isHealthy() ? 0 : 15; // 15 points if cache is down
    score -= Math.min((100 - cacheStats.hitRate) * 0.3, 10); // Max 10 points for low hit rate

    const criticalIssues = recommendations.filter(
      (r) => r.priority === "high"
    ).length;

    let performanceGrade: "A" | "B" | "C" | "D" | "F";
    if (score >= 90) performanceGrade = "A";
    else if (score >= 80) performanceGrade = "B";
    else if (score >= 70) performanceGrade = "C";
    else if (score >= 60) performanceGrade = "D";
    else performanceGrade = "F";

    const metrics: PerformanceMetrics = {
      database: {
        connectionPool: {
          active: connectionPoolMetrics.activeConnections,
          idle: connectionPoolMetrics.idleConnections,
          total: connectionPoolMetrics.totalConnections,
          maxConnections: connectionPoolMetrics.maxConnections,
        },
        slowQueries: slowQueries.slice(0, 10).map((q) => ({
          query: q.query,
          avgTime: q.duration,
          calls: 0, // calls not available from QueryAnalysis; default to 0
          totalTime: q.cost,
          table: q.table,
        })), // Limit for response size and map to expected shape
        missingIndexes: missingIndexes.slice(0, 10),
        tableBloat: tableBloat.slice(0, 10),
        metrics: {
          connectionPool: databaseMetrics.connectionPool,
          queryPerformance: databaseMetrics.queryPerformance,
          tableStats: databaseMetrics.tableStats.map((t) => ({
            tableName: t.table,
            rowCount: t.rowCount,
            sizeBytes: t.sizeBytes,
            indexCount: t.indexCount,
          })),
        },
      },
      cache: {
        isHealthy: redisService.isHealthy(),
        stats: {
          connected: redisService.isHealthy(),
          usedMemory: cacheStats.memoryUsage,
          totalKeys: cacheStats.keyCount,
          hitRate: cacheStats.hitRate,
          missRate:
            cacheStats.hits + cacheStats.misses > 0
              ? (cacheStats.misses / (cacheStats.hits + cacheStats.misses)) *
                100
              : 0,
        },
      },
      recommendations: recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      summary: {
        overallScore: Math.max(0, Math.round(score)),
        criticalIssues,
        performanceGrade,
      },
    };

    perf.finish("ok");
    return NextResponse.json(metrics, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    logger.error("Performance metrics error:", error);
    perf.finish("error");

    return NextResponse.json(
      { error: "Failed to fetch performance metrics" },
      { status: 500 }
    );
  }
});

// POST /api/admin/performance/optimize - Apply performance optimizations
export const POST = withRequest(async function POST(request) {
  const perf = trackPerformance("apply_optimization", {
    route: "/api/admin/performance/optimize",
  });

  try {
    const user = await requireAuth(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, parameters } = body;

    const dbOptimizer = DatabaseOptimizer.getInstance();
    let result: Record<string, unknown> = {};

    switch (action) {
      case "create_index":
        const { table, columns, type = "btree" } = parameters;
        const indexRecommendation = {
          table,
          columns,
          type,
          reason: "Manual optimization",
          estimatedImprovement: 0,
          priority: "medium" as const,
        };

        const success = await dbOptimizer.applyIndexRecommendation(
          indexRecommendation
        );
        result = {
          success,
          message: success
            ? "Index created successfully"
            : "Failed to create index",
        };
        break;

      case "optimize_table":
        const { tableName } = parameters;
        await dbOptimizer.optimizeTable(tableName);
        result = {
          success: true,
          message: `Table ${tableName} optimized successfully`,
        };
        break;

      case "clear_cache":
        const { pattern = "*" } = parameters;
        const redisService = RedisService.getInstance();
        const clearedKeys = await redisService.flushPattern(pattern);
        result = {
          success: true,
          message: `Cleared ${clearedKeys} cache entries`,
        };
        break;

      default:
        return NextResponse.json(
          { error: "Unknown optimization action" },
          { status: 400 }
        );
    }

    perf.finish("ok");
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Performance optimization error:", error);
    perf.finish("error");

    return NextResponse.json(
      { error: "Failed to apply optimization" },
      { status: 500 }
    );
  }
});
