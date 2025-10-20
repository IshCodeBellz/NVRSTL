// Security Service - Real-time security monitoring and management
import { prisma } from "@/lib/server/prisma";

export interface SecurityStats {
  blockedIPs: number;
  rateLimitViolations: number;
  securityAlerts: number;
  mfaUsers: number;
  suspiciousActivity: number;
  recentEvents: number;
}

export interface SecurityEvent {
  id: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  eventType: string;
  severity: "low" | "medium" | "high" | "critical";
  details?: Record<string, unknown>;
  location?: string;
  blocked: boolean;
  resolved: boolean;
  timestamp: Date;
  user?: {
    email: string;
    name?: string;
  };
}

export interface BlockedIPInfo {
  id: string;
  ipAddress: string;
  reason: string;
  blockedBy: string;
  blockedAt: Date;
  expiresAt?: Date;
  requestCount: number;
  lastAttempt: Date;
}

export interface RateLimitInfo {
  id: string;
  ipAddress: string;
  endpoint: string;
  requestCount: number;
  limit: number;
  windowStart: Date;
  windowEnd: Date;
  blocked: boolean;
}

export class SecurityService {
  // Log security events
  static async logSecurityEvent(data: {
    userId?: string;
    ipAddress: string;
    userAgent?: string;
    eventType: string;
    severity: "low" | "medium" | "high" | "critical";
    details?: Record<string, unknown>;
    location?: string;
    blocked?: boolean;
  }): Promise<void> {
    try {
      await prisma.securityEvent.create({
        data: {
          userId: data.userId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          eventType: data.eventType,
          severity: data.severity,
          details: data.details ? JSON.stringify(data.details) : null,
          location: data.location,
          blocked: data.blocked || false,
        },
      });

      // Auto-block IPs with high-severity events
      if (data.severity === "critical" && data.blocked) {
        await this.blockIP(
          data.ipAddress,
          `Auto-blocked: ${data.eventType}`,
          "system"
        );
      }
    } catch (error) {
      console.error("Error logging security event:", error);
    }
  }

  // Block an IP address
  static async blockIP(
    ipAddress: string,
    reason: string,
    blockedBy: string,
    expiresAt?: Date
  ): Promise<void> {
    try {
      await prisma.blockedIP.upsert({
        where: { ipAddress },
        update: {
          reason,
          blockedBy,
          expiresAt,
          isActive: true,
          requestCount: { increment: 1 },
          lastAttempt: new Date(),
        },
        create: {
          ipAddress,
          reason,
          blockedBy,
          expiresAt,
          isActive: true,
          requestCount: 1,
        },
      });
    } catch (error) {
      console.error("Error blocking IP:", error);
    }
  }

  // Check if IP is blocked
  static async isIPBlocked(ipAddress: string): Promise<boolean> {
    try {
      const blocked = await prisma.blockedIP.findFirst({
        where: {
          ipAddress,
          isActive: true,
          OR: [
            { expiresAt: null }, // Permanent block
            { expiresAt: { gte: new Date() } }, // Not yet expired
          ],
        },
      });
      return !!blocked;
    } catch (error) {
      console.error("Error checking IP block status:", error);
      return false;
    }
  }

  // Log rate limit violation
  static async logRateLimit(data: {
    ipAddress: string;
    endpoint: string;
    requestCount: number;
    limit: number;
    windowStart: Date;
    windowEnd: Date;
  }): Promise<void> {
    try {
      await prisma.rateLimitLog.create({
        data: {
          ipAddress: data.ipAddress,
          endpoint: data.endpoint,
          requestCount: data.requestCount,
          limit: data.limit,
          windowStart: data.windowStart,
          windowEnd: data.windowEnd,
          blocked: true,
        },
      });

      // Log as security event
      await this.logSecurityEvent({
        ipAddress: data.ipAddress,
        eventType: "rate_limit_exceeded",
        severity: "medium",
        details: {
          endpoint: data.endpoint,
          requestCount: data.requestCount,
          limit: data.limit,
        },
        blocked: true,
      });
    } catch (error) {
      console.error("Error logging rate limit:", error);
    }
  }

  // Get security statistics
  static async getSecurityStats(): Promise<SecurityStats> {
    try {
      const [
        blockedIPs,
        rateLimitViolations,
        securityAlerts,
        mfaUsers,
        suspiciousActivity,
        recentEvents,
      ] = await Promise.all([
        prisma.blockedIP.count({ where: { isActive: true } }),
        prisma.rateLimitLog.count({
          where: {
            timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.securityEvent.count({
          where: {
            severity: { in: ["high", "critical"] },
            resolved: false,
          },
        }),
        prisma.user.count({ where: { mfaEnabled: true } }),
        prisma.securityEvent.count({
          where: {
            eventType: "suspicious_activity",
            timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.securityEvent.count({
          where: {
            timestamp: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
          },
        }),
      ]);

      return {
        blockedIPs,
        rateLimitViolations,
        securityAlerts,
        mfaUsers,
        suspiciousActivity,
        recentEvents,
      };
    } catch (error) {
      console.error("Error fetching security stats:", error);
      return {
        blockedIPs: 0,
        rateLimitViolations: 0,
        securityAlerts: 0,
        mfaUsers: 0,
        suspiciousActivity: 0,
        recentEvents: 0,
      };
    }
  }

  // Get recent security events
  static async getRecentSecurityEvents(limit = 50): Promise<SecurityEvent[]> {
    try {
      const events = await prisma.securityEvent.findMany({
        include: {
          user: {
            select: { email: true, name: true },
          },
        },
        orderBy: { timestamp: "desc" },
        take: limit,
      });

      return events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        severity: event.severity as "low" | "medium" | "high" | "critical",
        details: event.details ? JSON.parse(event.details) : undefined,
        blocked: event.blocked,
        resolved: event.resolved,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent || undefined,
        location: event.location || undefined,
        riskScore: 0, // Not in schema, using default
        timestamp: event.timestamp,
        userId: event.userId || undefined,
        userName: event.user?.name || "Unknown",
        userEmail: event.user?.email || "unknown@example.com",
      }));
    } catch (error) {
      console.error("Error fetching security events:", error);
      return [];
    }
  }

  // Get blocked IPs
  static async getBlockedIPs(limit = 100): Promise<BlockedIPInfo[]> {
    try {
      const blockedIPs = await prisma.blockedIP.findMany({
        where: { isActive: true },
        orderBy: { blockedAt: "desc" },
        take: limit,
      });

      return blockedIPs.map((ip) => ({
        id: ip.id,
        ipAddress: ip.ipAddress,
        reason: ip.reason,
        blockedBy: ip.blockedBy,
        blockedAt: ip.blockedAt,
        expiresAt: ip.expiresAt || undefined,
        requestCount: ip.requestCount,
        lastAttempt: ip.lastAttempt,
      }));
    } catch (error) {
      console.error("Error fetching blocked IPs:", error);
      return [];
    }
  }

  // Unblock IP
  static async unblockIP(ipAddress: string): Promise<boolean> {
    try {
      await prisma.blockedIP.updateMany({
        where: { ipAddress, isActive: true },
        data: { isActive: false },
      });
      return true;
    } catch (error) {
      console.error("Error unblocking IP:", error);
      return false;
    }
  }

  // Get rate limit violations
  static async getRateLimitViolations(limit = 100): Promise<RateLimitInfo[]> {
    try {
      const violations = await prisma.rateLimitLog.findMany({
        where: { blocked: true },
        orderBy: { timestamp: "desc" },
        take: limit,
      });

      return violations.map((v) => ({
        id: v.id,
        ipAddress: v.ipAddress,
        endpoint: v.endpoint,
        requestCount: v.requestCount,
        limit: v.limit,
        windowStart: v.windowStart,
        windowEnd: v.windowEnd,
        blocked: v.blocked,
      }));
    } catch (error) {
      console.error("Error fetching rate limit violations:", error);
      return [];
    }
  }

  // Resolve security event
  static async resolveSecurityEvent(
    eventId: string,
    resolvedBy: string
  ): Promise<boolean> {
    try {
      await prisma.securityEvent.update({
        where: { id: eventId },
        data: {
          resolved: true,
          resolvedBy,
          resolvedAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      console.error("Error resolving security event:", error);
      return false;
    }
  }

  // Clean up expired blocks
  static async cleanupExpiredBlocks(): Promise<number> {
    try {
      const result = await prisma.blockedIP.updateMany({
        where: {
          isActive: true,
          expiresAt: { lt: new Date() },
        },
        data: { isActive: false },
      });
      return result.count;
    } catch (error) {
      console.error("Error cleaning up expired blocks:", error);
      return 0;
    }
  }

  // Generate security report
  static async generateSecurityReport(days = 7): Promise<{
    period: string;
    summary: {
      totalEvents: number;
      eventsResolved: number;
      activeBlocks: number;
    };
    eventsByType: { type: string; count: number }[];
    eventsBySeverity: { severity: string; count: number }[];
    topBlockedIPs: {
      ipAddress: string;
      reason: string;
      requestCount: number;
    }[];
    rateLimitsByEndpoint: {
      endpoint: string;
      totalRequests: number;
      violations: number;
    }[];
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [
        eventsByType,
        eventsBySeverity,
        topBlockedIPs,
        rateLimitsByEndpoint,
      ] = await Promise.all([
        prisma.securityEvent.groupBy({
          by: ["eventType"],
          where: { timestamp: { gte: startDate } },
          _count: { _all: true },
        }),
        prisma.securityEvent.groupBy({
          by: ["severity"],
          where: { timestamp: { gte: startDate } },
          _count: { _all: true },
        }),
        prisma.blockedIP.findMany({
          where: { isActive: true },
          orderBy: { requestCount: "desc" },
          take: 10,
        }),
        prisma.rateLimitLog.groupBy({
          by: ["endpoint"],
          where: { timestamp: { gte: startDate } },
          _count: { _all: true },
          _sum: { requestCount: true },
          orderBy: { _count: { endpoint: "desc" } },
        }),
      ]);

      return {
        period: `${days} days`,
        summary: {
          totalEvents: eventsByType.reduce((sum, e) => sum + e._count._all, 0),
          eventsResolved: await prisma.securityEvent.count({
            where: { timestamp: { gte: startDate }, resolved: true },
          }),
          activeBlocks: await prisma.blockedIP.count({
            where: { isActive: true },
          }),
        },
        eventsByType: eventsByType.map((e) => ({
          type: e.eventType,
          count: e._count._all,
        })),
        eventsBySeverity: eventsBySeverity.map((e) => ({
          severity: e.severity,
          count: e._count._all,
        })),
        topBlockedIPs: topBlockedIPs.map((ip) => ({
          ipAddress: ip.ipAddress,
          reason: ip.reason,
          requestCount: ip.requestCount,
          blockedAt: ip.blockedAt,
        })),
        rateLimitsByEndpoint: rateLimitsByEndpoint.map((r) => ({
          endpoint: r.endpoint,
          violations: r._count?._all || 0,
          totalRequests: r._sum?.requestCount || 0,
        })),
      };
    } catch (error) {
      console.error("Error generating security report:", error);
      return {
        period: `${days} days`,
        summary: { totalEvents: 0, eventsResolved: 0, activeBlocks: 0 },
        eventsByType: [],
        eventsBySeverity: [],
        topBlockedIPs: [],
        rateLimitsByEndpoint: [],
      };
    }
  }
}
