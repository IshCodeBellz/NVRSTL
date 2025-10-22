import Redis from "ioredis";
import { perfMonitor } from "@/lib/server/monitoring/performance";
import { alerts } from "@/lib/server/monitoring/alerts";

export interface CacheConfig {
  ttl: number; // seconds
  keyPrefix: string;
  maxRetries: number;
  retryDelay: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keyCount: number;
  memoryUsage: number;
  connectedClients: number;
  opsPerSecond: number;
}

class RedisService {
  private static instance: RedisService;
  private redis: Redis | null = null;
  private isConnected = false;
  private stats = {
    hits: 0,
    misses: 0,
    operations: 0,
    errors: 0,
  };

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    if (!process.env.REDIS_URL) {
      console.warn("Redis URL not configured, caching will be disabled");
      return;
    }

    try {
      this.redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        lazyConnect: true,
      });

      this.redis.on("error", (error: Error) => {
        console.error("Redis connection error:", error);
        alerts
          .createAlert(
            "redis_connection_failed",
            "high",
            "Redis Connection Failed",
            `Failed to connect to Redis: ${error.message}`,
            { error: error.message }
          )
          .catch(console.error);
      });

      this.redis.on("connect", () => {
        console.log("Connected to Redis");
        this.isConnected = true;
      });

      this.redis.on("error", (error) => {
        console.error("Redis error:", error);
        this.isConnected = false;
        this.stats.errors++;

        alerts
          .createAlert(
            "redis_error",
            "medium",
            "Redis Error",
            `Redis error: ${error.message}`,
            { error: error.message }
          )
          .catch(console.error);
      });

      this.redis.on("close", () => {
        console.warn("Redis connection closed");
        this.isConnected = false;
      });

      await this.redis.connect();
    } catch (error) {
      console.error("Failed to initialize Redis:", error);
      this.redis = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis || !this.isConnected) {
      this.stats.misses++;
      return null;
    }

    return perfMonitor.timeFunction(
      "redis_get",
      async () => {
        try {
          const value = await this.redis!.get(key);
          if (value === null) {
            this.stats.misses++;
            return null;
          }

          this.stats.hits++;
          this.stats.operations++;
          return JSON.parse(value) as T;
        } catch (error) {
          console.error("Redis GET error:", error);
          this.stats.errors++;
          this.stats.misses++;
          return null;
        }
      },
      { operation: "get", key }
    );
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    return perfMonitor.timeFunction(
      "redis_set",
      async () => {
        try {
          const serializedValue = JSON.stringify(value);

          if (ttlSeconds) {
            await this.redis!.setex(key, ttlSeconds, serializedValue);
          } else {
            await this.redis!.set(key, serializedValue);
          }

          this.stats.operations++;
          return true;
        } catch (error) {
          console.error("Redis SET error:", error);
          this.stats.errors++;
          return false;
        }
      },
      { operation: "set", key, ttl: ttlSeconds?.toString() || "none" }
    );
  }

  async del(key: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    return perfMonitor.timeFunction(
      "redis_del",
      async () => {
        try {
          await this.redis!.del(key);
          this.stats.operations++;
          return true;
        } catch (error) {
          console.error("Redis DEL error:", error);
          this.stats.errors++;
          return false;
        }
      },
      { operation: "del", key }
    );
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error("Redis EXISTS error:", error);
      return false;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.redis || !this.isConnected || keys.length === 0) {
      return keys.map(() => null);
    }

    return perfMonitor.timeFunction(
      "redis_mget",
      async () => {
        try {
          const values = await this.redis!.mget(...keys);
          this.stats.operations++;

          return values.map((value) => {
            if (value === null) {
              this.stats.misses++;
              return null;
            }
            this.stats.hits++;
            try {
              return JSON.parse(value) as T;
            } catch {
              this.stats.misses++;
              return null;
            }
          });
        } catch (error) {
          console.error("Redis MGET error:", error);
          this.stats.errors++;
          return keys.map(() => null);
        }
      },
      { operation: "mget", key_count: keys.length.toString() }
    );
  }

  async mset(
    keyValuePairs: Record<string, any>,
    ttlSeconds?: number
  ): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    return perfMonitor.timeFunction(
      "redis_mset",
      async () => {
        try {
          const pipeline = this.redis!.pipeline();

          Object.entries(keyValuePairs).forEach(([key, value]) => {
            const serializedValue = JSON.stringify(value);
            if (ttlSeconds) {
              pipeline.setex(key, ttlSeconds, serializedValue);
            } else {
              pipeline.set(key, serializedValue);
            }
          });

          await pipeline.exec();
          this.stats.operations++;
          return true;
        } catch (error) {
          console.error("Redis MSET error:", error);
          this.stats.errors++;
          return false;
        }
      },
      {
        operation: "mset",
        key_count: Object.keys(keyValuePairs).length.toString(),
      }
    );
  }

  async increment(key: string, amount: number = 1): Promise<number | null> {
    if (!this.redis || !this.isConnected) {
      return null;
    }

    try {
      const result = await this.redis.incrby(key, amount);
      this.stats.operations++;
      return result;
    } catch (error) {
      console.error("Redis INCR error:", error);
      this.stats.errors++;
      return null;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      await this.redis.expire(key, seconds);
      return true;
    } catch (error) {
      console.error("Redis EXPIRE error:", error);
      return false;
    }
  }

  async flushPattern(pattern: string): Promise<number> {
    if (!this.redis || !this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        return keys.length;
      }
      return 0;
    } catch (error) {
      console.error("Redis flush pattern error:", error);
      return 0;
    }
  }

  async getStats(): Promise<CacheStats> {
    let memoryUsage = 0;
    let keyCount = 0;
    let connectedClients = 0;

    if (this.redis && this.isConnected) {
      try {
        const info = await this.redis.info("memory");
        const memoryMatch = info.match(/used_memory:(\d+)/);
        memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;

        keyCount = await this.redis.dbsize();

        const clientsInfo = await this.redis.info("clients");
        const clientsMatch = clientsInfo.match(/connected_clients:(\d+)/);
        connectedClients = clientsMatch ? parseInt(clientsMatch[1]) : 0;
      } catch (error) {
        console.error("Error getting Redis stats:", error);
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate =
      totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      keyCount,
      memoryUsage,
      connectedClients,
      opsPerSecond: this.stats.operations, // This would need time-based calculation for accuracy
    };
  }

  isHealthy(): boolean {
    return this.isConnected && this.redis !== null;
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
      this.isConnected = false;
    }
  }

  // Helper method for cache-aside pattern
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch data
    const data = await perfMonitor.timeFunction(
      "cache_miss_fetch",
      fetchFunction,
      { cache_key: key }
    );

    // Store in cache for next time
    await this.set(key, data, ttlSeconds);
    return data;
  }

  // Bulk cache-aside pattern
  async getOrSetBulk<T>(
    keyDataPairs: Array<{ key: string; fetchFn: () => Promise<T> }>,
    ttlSeconds?: number
  ): Promise<T[]> {
    const keys = keyDataPairs.map((pair) => pair.key);
    const cachedValues = await this.mget<T>(keys);

    const results: T[] = [];
    const toFetch: Array<{
      index: number;
      fetchFn: () => Promise<T>;
      key: string;
    }> = [];

    // Identify cache misses
    cachedValues.forEach((value, index) => {
      if (value !== null) {
        results[index] = value;
      } else {
        toFetch.push({
          index,
          fetchFn: keyDataPairs[index].fetchFn,
          key: keyDataPairs[index].key,
        });
      }
    });

    // Fetch missing data in parallel
    if (toFetch.length > 0) {
      const fetchPromises = toFetch.map(async ({ index, fetchFn, key }) => {
        const data = await fetchFn();
        results[index] = data;
        return { key, data };
      });

      const fetchedData = await Promise.all(fetchPromises);

      // Cache the fetched data
      const cacheData = fetchedData.reduce((acc, { key, data }) => {
        acc[key] = data;
        return acc;
      }, {} as Record<string, T>);

      await this.mset(cacheData, ttlSeconds);
    }

    return results;
  }
}

// Specialized cache managers
export class ProductCache {
  private redis = RedisService.getInstance();
  private readonly PREFIX = "product:";
  private readonly TTL = 3600; // 1 hour

  async getProduct(productId: string): Promise<any | null> {
    return this.redis.get(`${this.PREFIX}${productId}`);
  }

  async setProduct(productId: string, product: any): Promise<boolean> {
    return this.redis.set(`${this.PREFIX}${productId}`, product, this.TTL);
  }

  async getProductsByCategory(categoryId: string): Promise<any[] | null> {
    return this.redis.get(`${this.PREFIX}category:${categoryId}`);
  }

  async setProductsByCategory(
    categoryId: string,
    products: any[]
  ): Promise<boolean> {
    return this.redis.set(
      `${this.PREFIX}category:${categoryId}`,
      products,
      this.TTL
    );
  }

  async invalidateProduct(productId: string): Promise<void> {
    await this.redis.del(`${this.PREFIX}${productId}`);
  }

  async invalidateCategory(categoryId: string): Promise<void> {
    await this.redis.flushPattern(`${this.PREFIX}category:${categoryId}*`);
  }
}

export class SearchCache {
  private redis = RedisService.getInstance();
  private readonly PREFIX = "search:";
  private readonly TTL = 900; // 15 minutes

  async getSearchResults(
    query: string,
    filters?: Record<string, any>
  ): Promise<any | null> {
    const cacheKey = this.buildSearchKey(query, filters);
    return this.redis.get(`${this.PREFIX}${cacheKey}`);
  }

  async setSearchResults(
    query: string,
    results: any,
    filters?: Record<string, any>
  ): Promise<boolean> {
    const cacheKey = this.buildSearchKey(query, filters);
    return this.redis.set(`${this.PREFIX}${cacheKey}`, results, this.TTL);
  }

  private buildSearchKey(query: string, filters?: Record<string, any>): string {
    const normalizedQuery = query.toLowerCase().trim();
    const filterStr = filters ? JSON.stringify(filters) : "";
    return Buffer.from(`${normalizedQuery}:${filterStr}`).toString("base64");
  }

  async invalidateSearchResults(): Promise<number> {
    return this.redis.flushPattern(`${this.PREFIX}*`);
  }
}

export class SessionCache {
  private redis = RedisService.getInstance();
  private readonly PREFIX = "session:";
  private readonly TTL = 86400; // 24 hours

  async getSession(sessionId: string): Promise<any | null> {
    return this.redis.get(`${this.PREFIX}${sessionId}`);
  }

  async setSession(sessionId: string, sessionData: any): Promise<boolean> {
    return this.redis.set(`${this.PREFIX}${sessionId}`, sessionData, this.TTL);
  }

  async extendSession(sessionId: string): Promise<boolean> {
    return this.redis.expire(`${this.PREFIX}${sessionId}`, this.TTL);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.redis.del(`${this.PREFIX}${sessionId}`);
  }
}

export { RedisService };
