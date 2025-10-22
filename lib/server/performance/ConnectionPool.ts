import { PrismaClient } from "@prisma/client";
import { perfMonitor } from "@/lib/server/monitoring/performance";
import { alerts } from "@/lib/server/monitoring/alerts";

export interface ConnectionPoolConfig {
  maxConnections: number;
  connectionTimeout: number; // milliseconds
  idleTimeout: number; // milliseconds
  maxLifetime: number; // milliseconds
  healthCheckInterval: number; // milliseconds
}

export interface PoolMetrics {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  maxConnections: number;
  queuedRequests: number;
  connectionErrors: number;
  averageConnectionTime: number;
  poolUtilization: number; // percentage
}

class ConnectionPoolManager {
  private static instance: ConnectionPoolManager;
  private prismaClients: PrismaClient[] = [];
  private activeConnections = new Set<PrismaClient>();
  private idleConnections: PrismaClient[] = [];
  private connectionQueue: Array<{
    resolve: (client: PrismaClient) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];

  private config: ConnectionPoolConfig;
  private metrics = {
    connectionErrors: 0,
    totalConnectionRequests: 0,
    connectionTimes: [] as number[],
    queuedRequests: 0,
  };

  private healthCheckTimer: NodeJS.Timeout | null = null;

  static getInstance(
    config?: Partial<ConnectionPoolConfig>
  ): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager(config);
    }
    return ConnectionPoolManager.instance;
  }

  private constructor(config?: Partial<ConnectionPoolConfig>) {
    this.config = {
      maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || "20"),
      connectionTimeout: 30000, // 30 seconds
      idleTimeout: 300000, // 5 minutes
      maxLifetime: 1800000, // 30 minutes
      healthCheckInterval: 60000, // 1 minute
      ...config,
    };

    this.initializePool();
    this.startHealthCheck();
  }

  private async initializePool(): Promise<void> {
    // Create initial connections (25% of max)
    const initialConnections = Math.max(
      1,
      Math.floor(this.config.maxConnections * 0.25)
    );

    for (let i = 0; i < initialConnections; i++) {
      try {
        const client = await this.createConnection();
        this.idleConnections.push(client);
      } catch (error) {
        console.error("Failed to create initial connection:", error);
        this.metrics.connectionErrors++;
      }
    }

    console.log(
      `Initialized connection pool with ${this.idleConnections.length} connections`
    );
  }

  private async createConnection(): Promise<PrismaClient> {
    const startTime = Date.now();

    try {
      const client = new PrismaClient({
        log: ["error", "warn"],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      // Test connection
      await client.$connect();

      const connectionTime = Date.now() - startTime;
      this.metrics.connectionTimes.push(connectionTime);

      // Keep only last 100 connection times for average calculation
      if (this.metrics.connectionTimes.length > 100) {
        this.metrics.connectionTimes = this.metrics.connectionTimes.slice(-100);
      }

      this.prismaClients.push(client);
      return client;
    } catch (error) {
      this.metrics.connectionErrors++;
      throw new Error(
        `Failed to create database connection: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getConnection(): Promise<PrismaClient> {
    return perfMonitor.timeFunction("get_database_connection", async () => {
      this.metrics.totalConnectionRequests++;

      // Check for idle connections first
      if (this.idleConnections.length > 0) {
        const client = this.idleConnections.pop()!;
        this.activeConnections.add(client);
        return client;
      }

      // Check if we can create a new connection
      if (this.prismaClients.length < this.config.maxConnections) {
        try {
          const client = await this.createConnection();
          this.activeConnections.add(client);
          return client;
        } catch (error) {
          console.error("Failed to create new connection:", error);
          // Fall through to queuing
        }
      }

      // Queue the request if pool is full
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const index = this.connectionQueue.findIndex(
            (req) => req.resolve === resolve
          );
          if (index !== -1) {
            this.connectionQueue.splice(index, 1);
            this.metrics.queuedRequests--;
          }
          reject(new Error("Connection request timed out"));
        }, this.config.connectionTimeout);

        this.connectionQueue.push({
          resolve: (client: PrismaClient) => {
            clearTimeout(timeout);
            resolve(client);
          },
          reject: (error: Error) => {
            clearTimeout(timeout);
            reject(error);
          },
          timestamp: Date.now(),
        });
        this.metrics.queuedRequests++;
      });
    });
  }

  async releaseConnection(client: PrismaClient): Promise<void> {
    if (!this.activeConnections.has(client)) {
      console.warn("Attempted to release connection not in active set");
      return;
    }

    this.activeConnections.delete(client);

    // Check if there are queued requests
    if (this.connectionQueue.length > 0) {
      const request = this.connectionQueue.shift()!;
      this.metrics.queuedRequests--;
      this.activeConnections.add(client);
      request.resolve(client);
      return;
    }

    // Return to idle pool
    this.idleConnections.push(client);
  }

  async withConnection<T>(
    operation: (client: PrismaClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getConnection();

    try {
      const result = await operation(client);
      await this.releaseConnection(client);
      return result;
    } catch (error) {
      await this.releaseConnection(client);
      throw error;
    }
  }

  async executeTransaction<T>(
    operations: (client: PrismaClient) => Promise<T>
  ): Promise<T> {
    return this.withConnection(async (client) => {
      return client.$transaction(
        async (tx) => {
          return operations(tx as PrismaClient);
        },
        {
          timeout: 30000, // 30 second timeout
          isolationLevel: "ReadCommitted",
        }
      );
    });
  }

  getMetrics(): PoolMetrics {
    const averageConnectionTime =
      this.metrics.connectionTimes.length > 0
        ? this.metrics.connectionTimes.reduce((sum, time) => sum + time, 0) /
          this.metrics.connectionTimes.length
        : 0;

    const poolUtilization =
      (this.activeConnections.size / this.config.maxConnections) * 100;

    return {
      activeConnections: this.activeConnections.size,
      idleConnections: this.idleConnections.length,
      totalConnections: this.prismaClients.length,
      maxConnections: this.config.maxConnections,
      queuedRequests: this.connectionQueue.length,
      connectionErrors: this.metrics.connectionErrors,
      averageConnectionTime,
      poolUtilization,
    };
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    const metrics = this.getMetrics();

    // Check for high pool utilization
    if (metrics.poolUtilization > 80) {
      alerts
        .createAlert(
          "high_db_pool_utilization",
          "medium",
          "High Database Pool Utilization",
          `Database connection pool is ${metrics.poolUtilization.toFixed(
            1
          )}% utilized`,
          {
            active_connections: metrics.activeConnections,
            max_connections: metrics.maxConnections,
            utilization: metrics.poolUtilization,
          }
        )
        .catch(console.error);
    }

    // Check for queued requests
    if (metrics.queuedRequests > 5) {
      alerts
        .createAlert(
          "db_connection_queue_buildup",
          "high",
          "Database Connection Queue Buildup",
          `${metrics.queuedRequests} requests are queued for database connections`,
          {
            queued_requests: metrics.queuedRequests,
            active_connections: metrics.activeConnections,
            pool_utilization: metrics.poolUtilization,
          }
        )
        .catch(console.error);
    }

    // Check for connection errors
    if (this.metrics.connectionErrors > 0) {
      console.warn(
        `Database connection errors detected: ${this.metrics.connectionErrors}`
      );
      // Reset error count after reporting
      this.metrics.connectionErrors = 0;
    }

    // Remove stale idle connections
    await this.cleanupStaleConnections();
  }

  private async cleanupStaleConnections(): Promise<void> {
    const staleConnections: PrismaClient[] = [];

    // Find connections that have exceeded their lifetime
    for (const client of this.idleConnections) {
      // Note: In a real implementation, you'd track connection creation time
      // For now, we'll implement a simple cleanup based on idle pool size
      if (
        this.idleConnections.length >
        Math.floor(this.config.maxConnections * 0.5)
      ) {
        staleConnections.push(client);
      }
    }

    // Remove and disconnect stale connections
    for (const client of staleConnections) {
      const index = this.idleConnections.indexOf(client);
      if (index !== -1) {
        this.idleConnections.splice(index, 1);
      }

      const prismaIndex = this.prismaClients.indexOf(client);
      if (prismaIndex !== -1) {
        this.prismaClients.splice(prismaIndex, 1);
      }

      try {
        await client.$disconnect();
      } catch (error) {
        console.error("Error disconnecting stale connection:", error);
      }
    }

    if (staleConnections.length > 0) {
      console.log(`Cleaned up ${staleConnections.length} stale connections`);
    }
  }

  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Reject all queued requests
    const queuedRequests = [...this.connectionQueue];
    this.connectionQueue = [];

    for (const request of queuedRequests) {
      request.reject(new Error("Connection pool is shutting down"));
    }

    // Disconnect all connections
    const allConnections = [...this.prismaClients];

    for (const client of allConnections) {
      try {
        await client.$disconnect();
      } catch (error) {
        console.error("Error disconnecting client during shutdown:", error);
      }
    }

    this.prismaClients = [];
    this.activeConnections.clear();
    this.idleConnections = [];

    console.log("Connection pool shutdown complete");
  }

  // Query optimization helpers
  async optimizeQuery<T>(
    query: () => Promise<T>,
    cacheKey?: string,
    ttlSeconds?: number
  ): Promise<T> {
    // If caching is enabled and cache key provided
    if (cacheKey) {
      const { RedisService } = await import("./RedisService");
      const redis = RedisService.getInstance();

      return redis.getOrSet(cacheKey, query, ttlSeconds);
    }

    return query();
  }

  // Batch operation helper
  async batchOperations<T>(
    operations: Array<() => Promise<T>>,
    batchSize: number = 10
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((op) => perfMonitor.timeFunction("batch_operation", op))
      );
      results.push(...batchResults);
    }

    return results;
  }
}

// Singleton instance with default configuration
export const connectionPool = ConnectionPoolManager.getInstance();

export { ConnectionPoolManager };
