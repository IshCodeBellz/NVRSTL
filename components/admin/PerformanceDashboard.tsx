"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Server,
} from "lucide-react";

interface PerformanceMetrics {
  database: {
    connectionPool: {
      activeConnections: number;
      idleConnections: number;
      totalConnections: number;
      maxConnections: number;
      queuedRequests: number;
      connectionErrors: number;
      averageConnectionTime: number;
      poolUtilization: number;
    };
    slowQueries: Array<{
      query: string;
      table: string;
      duration: number;
      recommendations: string[];
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
    };
  };
  cache: {
    isHealthy: boolean;
    stats: {
      hits: number;
      misses: number;
      hitRate: number;
      keyCount: number;
      memoryUsage: number;
      connectedClients: number;
      opsPerSecond: number;
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

const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/admin/performance");
      if (!response.ok) {
        throw new Error("Failed to fetch performance metrics");
      }
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const applyOptimization = async (
    action: string,
    parameters: Record<string, unknown>
  ) => {
    setOptimizing(action);
    try {
      const response = await fetch("/api/admin/performance/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, parameters }),
      });

      const result = await response.json();
      if (result.success) {
        // Refresh metrics after optimization
        await fetchMetrics();
      } else {
        throw new Error(result.message || "Optimization failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setOptimizing(null);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "text-green-600 bg-green-100";
      case "B":
        return "text-blue-600 bg-blue-100";
      case "C":
        return "text-yellow-600 bg-yellow-100";
      case "D":
        return "text-orange-600 bg-orange-100";
      case "F":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-blue-100 text-blue-800",
    };

    return (
      <Badge
        className={variants[priority as keyof typeof variants] || variants.low}
      >
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <XCircle className="w-5 h-5" />
            <span>Error loading performance data: {error}</span>
          </div>
          <Button onClick={fetchMetrics} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return <div>No metrics available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Performance Dashboard</h1>
        <Button onClick={fetchMetrics}>Refresh</Button>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${getGradeColor(
                  metrics.summary.performanceGrade
                )}`}
              >
                {metrics.summary.performanceGrade}
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {metrics.summary.overallScore}
                </p>
                <p className="text-sm text-gray-600">Overall Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics.summary.criticalIssues}
                </p>
                <p className="text-sm text-gray-600">Critical Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics.database.connectionPool.poolUtilization.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600">Pool Utilization</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Zap
                className={`w-8 h-8 ${
                  metrics.cache.isHealthy ? "text-green-600" : "text-red-600"
                }`}
              />
              <div>
                <p className="text-2xl font-bold">
                  {metrics.cache.stats.hitRate.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600">Cache Hit Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Connection Pool Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="w-5 h-5" />
                <span>Database Connection Pool</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {metrics.database.connectionPool.activeConnections}
                  </p>
                  <p className="text-sm text-gray-600">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics.database.connectionPool.idleConnections}
                  </p>
                  <p className="text-sm text-gray-600">Idle</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {metrics.database.connectionPool.totalConnections}/
                    {metrics.database.connectionPool.maxConnections}
                  </p>
                  <p className="text-sm text-gray-600">Total/Max</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {metrics.database.connectionPool.queuedRequests}
                  </p>
                  <p className="text-sm text-gray-600">Queued</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cache Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Cache Performance</span>
                <Badge
                  className={
                    metrics.cache.isHealthy
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }
                >
                  {metrics.cache.isHealthy ? "HEALTHY" : "UNHEALTHY"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {metrics.cache.stats.hits.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Cache Hits</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {metrics.cache.stats.misses.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Cache Misses</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {metrics.cache.stats.keyCount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Keys Stored</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {formatBytes(metrics.cache.stats.memoryUsage)}
                  </p>
                  <p className="text-sm text-gray-600">Memory Used</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          {/* Slow Queries */}
          <Card>
            <CardHeader>
              <CardTitle>Slow Queries</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.database.slowQueries.length > 0 ? (
                <div className="space-y-3">
                  {metrics.database.slowQueries.map((query, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{query.table}</span>
                        <Badge className="bg-red-100 text-red-800">
                          {query.duration.toFixed(2)}ms
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 font-mono mb-2">
                        {query.query.substring(0, 100)}...
                      </p>
                      {query.recommendations.map((rec, i) => (
                        <p key={i} className="text-sm text-blue-600">
                          • {rec}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No slow queries detected
                </p>
              )}
            </CardContent>
          </Card>

          {/* Missing Indexes */}
          <Card>
            <CardHeader>
              <CardTitle>Missing Indexes</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.database.missingIndexes.length > 0 ? (
                <div className="space-y-3">
                  {metrics.database.missingIndexes.map((index, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium">{index.table}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            ({index.columns.join(", ")})
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          {getPriorityBadge(index.priority)}
                          <Badge className="bg-green-100 text-green-800">
                            +{index.estimatedImprovement}%
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {index.reason}
                      </p>
                      <Button
                        size="sm"
                        onClick={() =>
                          applyOptimization("create_index", {
                            table: index.table,
                            columns: index.columns,
                            type: index.type,
                          })
                        }
                        disabled={optimizing === "create_index"}
                      >
                        Create Index
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  All recommended indexes are in place
                </p>
              )}
            </CardContent>
          </Card>

          {/* Table Bloat */}
          {metrics.database.tableBloat.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Table Bloat Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.database.tableBloat.map((table, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{table.table}</span>
                        <div className="flex space-x-2">
                          <Badge
                            className={
                              table.bloatPercent > 50
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {table.bloatPercent.toFixed(1)}% bloat
                          </Badge>
                          <Badge variant="outline">
                            {formatBytes(table.wastedBytes)} wasted
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {table.recommendation}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          applyOptimization("optimize_table", {
                            tableName: table.table,
                          })
                        }
                        disabled={optimizing === "optimize_table"}
                      >
                        Optimize Table
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cache Tab */}
        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cache Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={() =>
                    applyOptimization("clear_cache", { pattern: "product:*" })
                  }
                  disabled={optimizing === "clear_cache"}
                  variant="outline"
                >
                  Clear Product Cache
                </Button>
                <Button
                  onClick={() =>
                    applyOptimization("clear_cache", { pattern: "search:*" })
                  }
                  disabled={optimizing === "clear_cache"}
                  variant="outline"
                >
                  Clear Search Cache
                </Button>
                <Button
                  onClick={() =>
                    applyOptimization("clear_cache", { pattern: "*" })
                  }
                  disabled={optimizing === "clear_cache"}
                  variant="destructive"
                >
                  Clear All Cache
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {metrics.recommendations.map((rec, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          {getPriorityBadge(rec.priority)}
                          <span className="font-medium">{rec.title}</span>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          {rec.estimatedImprovement}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {rec.description}
                      </p>
                      <p className="text-sm text-blue-600 font-mono">
                        {rec.action}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
                  <p className="text-gray-500">
                    No performance recommendations - system is optimized!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;
