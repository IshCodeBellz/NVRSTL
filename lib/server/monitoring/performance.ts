/* eslint-disable @typescript-eslint/no-explicit-any */
import { performance } from "perf_hooks";
import { captureException } from "@sentry/nextjs";
import { alerts } from "./alerts";

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  tags: Record<string, string>;
  metadata: Record<string, any>;
}

export interface PerformanceThreshold {
  warning: number; // milliseconds
  critical: number; // milliseconds
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private activeTimers: Map<string, number> = new Map();
  private metrics: PerformanceMetric[] = [];
  private maxMetricsRetention = 1000; // Keep last 1000 metrics

  // Default thresholds for common operations
  private defaultThresholds: Record<string, PerformanceThreshold> = {
    database_query: { warning: 1000, critical: 5000 },
    api_request: { warning: 2000, critical: 10000 },
    shipping_api_call: { warning: 5000, critical: 15000 },
    email_send: { warning: 3000, critical: 10000 },
    file_upload: { warning: 5000, critical: 20000 },
    image_processing: { warning: 2000, critical: 8000 },
    search_query: { warning: 500, critical: 2000 },
    page_render: { warning: 1000, critical: 3000 },
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private constructor() {
    // Clean up old metrics periodically
    setInterval(() => {
      if (this.metrics.length > this.maxMetricsRetention) {
        this.metrics = this.metrics.slice(-this.maxMetricsRetention);
      }
    }, 60000); // Every minute
  }

  startTimer(name: string): string {
    const timerId = `${name}-${Date.now()}-${Math.random()}`;
    this.activeTimers.set(timerId, performance.now());
    return timerId;
  }

  endTimer(
    timerId: string,
    name: string,
    tags: Record<string, string> = {},
    metadata: Record<string, any> = {}
  ): number {
    const startTime = this.activeTimers.get(timerId);
    if (!startTime) {
      console.warn(`Timer ${timerId} not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.activeTimers.delete(timerId);

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      tags,
      metadata,
    };

    this.recordMetric(metric);
    this.checkThresholds(metric);

    return duration;
  }

  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Log to Sentry for tracking
    if (process.env.SENTRY_DSN) {
      try {
        // Only send to Sentry if it's above warning threshold or has error tags
        const threshold = this.defaultThresholds[metric.name];
        const isSlowOperation =
          threshold && metric.duration > threshold.warning;
        const hasError =
          metric.tags.status === "error" || metric.tags.error === "true";

        if (isSlowOperation || hasError) {
          captureException(new Error(`Performance metric: ${metric.name}`), {
            tags: {
              ...metric.tags,
              performance_metric: "true",
              operation: metric.name,
            },
            extra: {
              duration_ms: metric.duration,
              timestamp: metric.timestamp.toISOString(),
              metadata: metric.metadata,
            },
            level: hasError ? "error" : "warning",
          });
        }
      } catch (error) {
        console.error("Failed to send performance metric to Sentry:", error);
      }
    }
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.defaultThresholds[metric.name];
    if (!threshold) return;

    if (metric.duration > threshold.critical) {
      // Critical performance issue
      alerts
        .databaseSlow(`${metric.name} operation`, metric.duration)
        .catch(console.error);
    } else if (metric.duration > threshold.warning) {
      // Warning level - log but don't alert
      console.warn(
        `Slow operation detected: ${metric.name} took ${metric.duration}ms`
      );
    }
  }

  // Convenience method for timing functions
  async timeFunction<T>(
    name: string,
    fn: () => Promise<T>,
    tags: Record<string, string> = {},
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const timerId = this.startTimer(name);
    let result: T;
    let error: Error | null = null;

    try {
      result = await fn();
      tags.status = "success";
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      tags.status = "error";
      tags.error_type = error.constructor.name;
      metadata.error_message = error.message;
      throw error;
    } finally {
      this.endTimer(timerId, name, tags, metadata);
    }

    return result;
  }

  // Get performance statistics
  getStats(
    metricName?: string,
    timeWindow?: { start: Date; end: Date }
  ): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50: number;
    p95: number;
    p99: number;
    errorRate: number;
  } {
    let filteredMetrics = this.metrics;

    if (metricName) {
      filteredMetrics = filteredMetrics.filter((m) => m.name === metricName);
    }

    if (timeWindow) {
      filteredMetrics = filteredMetrics.filter(
        (m) => m.timestamp >= timeWindow.start && m.timestamp <= timeWindow.end
      );
    }

    if (filteredMetrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        errorRate: 0,
      };
    }

    const durations = filteredMetrics
      .map((m) => m.duration)
      .sort((a, b) => a - b);
    const errorCount = filteredMetrics.filter(
      (m) => m.tags.status === "error"
    ).length;

    return {
      count: filteredMetrics.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      errorRate: (errorCount / filteredMetrics.length) * 100,
    };
  }

  // Get recent slow operations
  getSlowOperations(limit: number = 10): PerformanceMetric[] {
    return this.metrics
      .filter((m) => {
        const threshold = this.defaultThresholds[m.name];
        return threshold && m.duration > threshold.warning;
      })
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  // Set custom threshold for a specific operation
  setThreshold(operationName: string, threshold: PerformanceThreshold): void {
    this.defaultThresholds[operationName] = threshold;
  }

  // Get all metrics for debugging
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Clear metrics (useful for testing)
  clearMetrics(): void {
    this.metrics = [];
    this.activeTimers.clear();
  }
}

// Convenience functions for common operations
export const perfMonitor = {
  getInstance: () => PerformanceMonitor.getInstance(),

  // Generic function timing
  async timeFunction<T>(
    name: string,
    fn: () => Promise<T>,
    tags: Record<string, string> = {},
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const monitor = PerformanceMonitor.getInstance();
    return monitor.timeFunction(name, fn, tags, metadata);
  },

  // Database operations
  async timeQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const monitor = PerformanceMonitor.getInstance();
    return monitor.timeFunction(
      "database_query",
      queryFn,
      { query: queryName },
      { queryName, ...metadata }
    );
  },

  // API calls
  async timeApiCall<T>(
    apiName: string,
    apiFn: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const monitor = PerformanceMonitor.getInstance();
    return monitor.timeFunction(
      "api_request",
      apiFn,
      { api: apiName },
      { apiName, ...metadata }
    );
  },

  // Shipping API calls
  async timeShippingApi<T>(
    carrier: string,
    operation: string,
    apiFn: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const monitor = PerformanceMonitor.getInstance();
    return monitor.timeFunction(
      "shipping_api_call",
      apiFn,
      { carrier, operation },
      { carrier, operation, ...metadata }
    );
  },

  // Email operations
  async timeEmail<T>(
    emailType: string,
    emailFn: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const monitor = PerformanceMonitor.getInstance();
    return monitor.timeFunction(
      "email_send",
      emailFn,
      { email_type: emailType },
      { emailType, ...metadata }
    );
  },

  // Search operations
  async timeSearch<T>(
    searchType: string,
    searchFn: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const monitor = PerformanceMonitor.getInstance();
    return monitor.timeFunction(
      "search_query",
      searchFn,
      { search_type: searchType },
      { searchType, ...metadata }
    );
  },
};

export { PerformanceMonitor };
