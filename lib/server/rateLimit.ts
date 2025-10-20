import { prisma } from "./prisma";
import { NextRequest } from "next/server";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string; // Custom key generation
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // Seconds until next request allowed
}

/**
 * Advanced rate limiting service with database persistence
 */
export class RateLimitService {
  /**
   * Check and update rate limit for a request
   */
  static async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = new Date();
    // Window start calculation available if needed
    // const _windowStart = new Date(now.getTime() - config.windowMs);

    // Clean up expired entries first
    await this.cleanupExpiredEntries();

    // Get or create rate limit entry
    const resetAt = new Date(now.getTime() + config.windowMs);

    let entry = await prisma.rateLimitEntry.findUnique({
      where: { key },
    });

    if (!entry || entry.resetAt <= now) {
      // Create new entry or reset expired one
      entry = await prisma.rateLimitEntry.upsert({
        where: { key },
        create: {
          key,
          count: 1,
          resetAt,
        },
        update: {
          count: 1,
          resetAt,
        },
      });

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: resetAt,
      };
    }

    // Update existing entry
    const updatedEntry = await prisma.rateLimitEntry.update({
      where: { key },
      data: {
        count: { increment: 1 },
      },
    });

    const allowed = updatedEntry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - updatedEntry.count);
    const retryAfter = allowed
      ? undefined
      : Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000);

    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime: entry.resetAt,
      retryAfter,
    };
  }

  /**
   * Generate rate limit key for IP-based limiting
   */
  static generateIPKey(req: NextRequest, endpoint: string): string {
    const ip = this.getClientIP(req);
    return `ip:${ip}:${endpoint}`;
  }

  /**
   * Generate rate limit key for user-based limiting
   */
  static generateUserKey(userId: string, endpoint: string): string {
    return `user:${userId}:${endpoint}`;
  }

  /**
   * Generate rate limit key for email-based limiting
   */
  static generateEmailKey(email: string, endpoint: string): string {
    return `email:${email}:${endpoint}`;
  }

  /**
   * Get client IP address from request
   */
  static getClientIP(req: NextRequest): string {
    // Check various headers for real IP
    const forwarded = req.headers.get("x-forwarded-for");
    const realIP = req.headers.get("x-real-ip");
    const cfIP = req.headers.get("cf-connecting-ip"); // Cloudflare

    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    if (realIP) {
      return realIP;
    }

    if (cfIP) {
      return cfIP;
    }

    // Fallback to connection remote address
    return req.ip || "unknown";
  }

  /**
   * Clean up expired rate limit entries
   */
  static async cleanupExpiredEntries(): Promise<void> {
    const now = new Date();

    try {
      await prisma.rateLimitEntry.deleteMany({
        where: {
          resetAt: {
            lte: now,
          },
        },
      });
    } catch (error) {
      console.error("Error:", error);
      console.error("Failed to cleanup expired rate limit entries:", error);
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  static async resetRateLimit(key: string): Promise<void> {
    await prisma.rateLimitEntry
      .delete({
        where: { key },
      })
      .catch(() => {
        // Ignore if entry doesn't exist
      });
  }

  /**
   * Get current rate limit status without incrementing
   */
  static async getRateLimitStatus(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const entry = await prisma.rateLimitEntry.findUnique({
      where: { key },
    });

    const now = new Date();

    if (!entry || entry.resetAt <= now) {
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: new Date(now.getTime() + config.windowMs),
      };
    }

    const allowed = entry.count < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const retryAfter = allowed
      ? undefined
      : Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000);

    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime: entry.resetAt,
      retryAfter,
    };
  }
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitConfigs = {
  // Authentication endpoints
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per IP
  },

  REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 registrations per IP
  },

  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 reset requests per email
  },

  MFA_VERIFY: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 attempts per user
  },

  // API endpoints
  API_GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per IP
  },

  API_HEAVY: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per IP for heavy operations
  },

  // Search endpoints
  SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 searches per IP
  },

  // Admin endpoints
  ADMIN: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50, // 50 requests per admin user
  },
} as const;

// Legacy functions for backward compatibility
interface Bucket {
  tokens: number;
  updated: number; // epoch ms
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  intervalMs: number
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) || { tokens: limit, updated: now };
  if (now - bucket.updated >= intervalMs) {
    bucket.tokens = limit;
    bucket.updated = now;
  }
  if (bucket.tokens <= 0) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}

// Test-only helper to clear buckets between tests to avoid cross-test pollution
export function __resetRateLimitForTests() {
  buckets.clear();
}
