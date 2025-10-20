import {
  SecurityEventType,
  SecurityEvent,
  calculateRiskScore,
  generateDeviceFingerprint,
} from "../security";
import { NextRequest } from "next/server";
import { captureError } from "./errors";

// Simple ID generator for demo purposes
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export interface SecurityEventContext {
  userId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint?: string;
  details?: Record<string, unknown>;
  location?: string;
}

export interface SecurityAlert {
  id: string;
  type:
    | "HIGH_RISK"
    | "SUSPICIOUS_ACTIVITY"
    | "ACCOUNT_COMPROMISE"
    | "BRUTE_FORCE";
  message: string;
  userId?: string;
  riskScore: number;
  events: SecurityEvent[];
  timestamp: Date;
}

/**
 * Security monitoring and threat detection service
 */
export class SecurityService {
  /**
   * Log a security event
   */
  static async logSecurityEvent(
    type: SecurityEventType,
    context: SecurityEventContext
  ): Promise<SecurityEvent | null> {
    try {
      // Calculate risk score
      const riskScore = calculateRiskScore(type, {
        isNewDevice: await this.isNewDevice(context),
        isNewLocation: await this.isNewLocation(context),
        failedAttempts: await this.getRecentFailedAttempts(context),
        timeOfDay: this.assessTimeOfDay(),
      });

      // Create security event (commented out due to Prisma client issues)
      /*
      const event = await prisma.securityEvent.create({
        data: {
          userId: context.userId || '',
          type,
          details: JSON.stringify(context.details || {}),
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          location: context.location,
          riskScore
        }
      });
      */

      // For now, log to console
      const event = {
        id: generateId(),
        userId: context.userId || "anonymous",
        type,
        details: context.details || {},
        ipAddress: context.ipAddress || "unknown",
        userAgent: context.userAgent || "unknown",
        location: context.location,
        riskScore,
        timestamp: new Date(),
      };

      console.log("Security Event Logged:", {
        type,
        riskScore,
        userId: context.userId,
        ipAddress: context.ipAddress,
      });

      // Check if this event should trigger an alert
      await this.checkForSecurityAlerts(event, context);

      return event;
    } catch (error) {
      console.error("Error:", error);
      console.error("Failed to log security event:", error);
      captureError(error as Error, {
        userId: context.userId,
      });
      return null;
    }
  }

  /**
   * Check if device is new for the user
   */
  static async isNewDevice(context: SecurityEventContext): Promise<boolean> {
    if (!context.userId) return true;

    // Check if device exists (commented out due to Prisma client issues)
    /*
    const existingDevice = await prisma.trustedDevice.findFirst({
      where: {
        userId: context.userId,
        deviceId
      }
    });

    return !existingDevice;
    */

    // For now, assume all devices are new
    return true;
  }

  /**
   * Check if location is new for the user
   */
  static async isNewLocation(context: SecurityEventContext): Promise<boolean> {
    if (!context.userId || !context.location) return false;

    // Check recent logins from this location (commented out due to Prisma client issues)
    /*
    const recentEvents = await prisma.securityEvent.findMany({
      where: {
        userId: context.userId,
        location: context.location,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      take: 1
    });

    return recentEvents.length === 0;
    */

    // For now, assume all locations are familiar
    return false;
  }

  /**
   * Get recent failed attempts for user
   */
  static async getRecentFailedAttempts(
    context: SecurityEventContext
  ): Promise<number> {
    if (!context.userId) return 0;

    // Count recent failed login attempts (commented out due to Prisma client issues)
    /*
    const failedAttempts = await prisma.securityEvent.count({
      where: {
        userId: context.userId,
        type: SecurityEventType.MFA_VERIFICATION_FAILED,
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      }
    });

    return failedAttempts;
    */

    return 0;
  }

  /**
   * Assess if current time is unusual for user activity
   */
  static assessTimeOfDay(): "normal" | "unusual" {
    const hour = new Date().getHours();

    // Consider 2 AM to 6 AM as unusual
    if (hour >= 2 && hour <= 6) {
      return "unusual";
    }

    return "normal";
  }

  /**
   * Check for security alerts based on recent events
   */
  static async checkForSecurityAlerts(
    event: SecurityEvent,
    context: SecurityEventContext
  ): Promise<void> {
    try {
      // High risk score alert
      if (event.riskScore && event.riskScore >= 80) {
        await this.createSecurityAlert("HIGH_RISK", {
          message: `High risk security event detected (score: ${event.riskScore})`,
          userId: context.userId,
          riskScore: event.riskScore,
          events: [event],
        });
      }

      // Brute force detection
      if (context.userId) {
        const recentFailures = await this.getRecentFailedAttempts(context);
        if (recentFailures >= 5) {
          await this.createSecurityAlert("BRUTE_FORCE", {
            message: `Potential brute force attack detected: ${recentFailures} failed attempts`,
            userId: context.userId,
            riskScore: 90,
            events: [event],
          });
        }
      }

      // Suspicious activity patterns
      if (event.type === SecurityEventType.SUSPICIOUS_LOGIN) {
        await this.createSecurityAlert("SUSPICIOUS_ACTIVITY", {
          message: "Suspicious login activity detected",
          userId: context.userId,
          riskScore: event.riskScore || 0,
          events: [event],
        });
      }
    } catch (error) {
      console.error("Error:", error);
      console.error("Failed to check security alerts:", error);
    }
  }

  /**
   * Create security alert
   */
  static async createSecurityAlert(
    type: SecurityAlert["type"],
    data: Omit<SecurityAlert, "id" | "type" | "timestamp">
  ): Promise<void> {
    const alert: SecurityAlert = {
      id: `alert-${Date.now()}`,
      type,
      timestamp: new Date(),
      ...data,
    };

    // Log alert
    console.warn("SECURITY ALERT:", {
      type: alert.type,
      message: alert.message,
      riskScore: alert.riskScore,
      userId: alert.userId,
    });

    // In production, this would:
    // 1. Store in database
    // 2. Send notifications to security team
    // 3. Trigger automated responses if needed
    // 4. Integration with SIEM systems

    // For critical alerts, could trigger immediate actions
    if (type === "HIGH_RISK" || type === "ACCOUNT_COMPROMISE") {
      await this.handleCriticalAlert(alert);
    }
  }

  /**
   * Handle critical security alerts
   */
  static async handleCriticalAlert(alert: SecurityAlert): Promise<void> {
    try {
      // In production, this might:
      // 1. Temporarily lock account
      // 2. Require additional verification
      // 3. Send immediate notifications
      // 4. Trigger incident response

      console.error("CRITICAL SECURITY ALERT:", alert);

      // For now, just log the critical alert
      if (alert.userId && alert.riskScore >= 95) {
        console.warn(
          `Consider temporarily locking user account: ${alert.userId}`
        );
      }
    } catch (error) {
      console.error("Error:", error);
      console.error("Failed to handle critical alert:", error);
    }
  }

  /**
   * Trust a device for a user
   */
  static async trustDevice(
    userId: string,
    deviceInfo: {
      name: string;
      userAgent: string;
      ipAddress: string;
      location?: string;
    }
  ): Promise<void> {
    try {
      const deviceId = generateDeviceFingerprint(
        deviceInfo.userAgent,
        deviceInfo.ipAddress
      );

      // Create trusted device (commented out due to Prisma client issues)
      /*
      await prisma.trustedDevice.upsert({
        where: {
          userId_deviceId: {
            userId,
            deviceId
          }
        },
        create: {
          userId,
          deviceId,
          name: deviceInfo.name,
          userAgent: deviceInfo.userAgent,
          ipAddress: deviceInfo.ipAddress,
          location: deviceInfo.location,
          trusted: true,
          lastUsed: new Date()
        },
        update: {
          trusted: true,
          lastUsed: new Date(),
          name: deviceInfo.name
        }
      });
      */

      console.log(`Device trusted for user ${userId}:`, {
        deviceId,
        name: deviceInfo.name,
      });

      // Log security event
      await this.logSecurityEvent(SecurityEventType.DEVICE_TRUSTED, {
        userId,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        location: deviceInfo.location,
        details: { deviceId, deviceName: deviceInfo.name },
      });
    } catch (error) {
      console.error("Error:", error);
      console.error("Failed to trust device:", error);
      throw error;
    }
  }

  /**
   * Get security summary for a user
   */
  static async getUserSecuritySummary() {
    try {
      // This would fetch from database in production
      return {
        mfaEnabled: false, // Would check user.mfaEnabled
        trustedDevices: 0, // Would count trusted devices
        recentSecurityEvents: 0, // Would count recent events
        riskLevel: "LOW" as "LOW" | "MEDIUM" | "HIGH",
        lastSecurityReview: null,
      };
    } catch (error) {
      console.error("Error:", error);
      console.error("Failed to get security summary:", error);
      return null;
    }
  }

  /**
   * Extract security context from request
   */
  static extractSecurityContext(
    req: NextRequest | Request,
    userId?: string
  ): SecurityEventContext {
    let userAgent = "unknown";
    let endpoint = "unknown";

    // Handle NextRequest
    if (req instanceof NextRequest) {
      userAgent = req.headers.get("user-agent") || "unknown";
      endpoint = req.nextUrl?.pathname || "unknown";
    }
    // Handle standard Request
    else if (req.headers && typeof req.headers.get === "function") {
      userAgent = req.headers.get("user-agent") || "unknown";
      endpoint = req.url || "unknown";
    }

    return {
      userId,
      ipAddress: this.getClientIP(req),
      userAgent,
      endpoint,
      // location would be determined by IP geolocation service
    };
  }

  /**
   * Get client IP from request
   */
  static getClientIP(req: NextRequest | Request): string {
    // Handle NextRequest (with .get() method)
    if (req.headers && typeof req.headers.get === "function") {
      const forwarded = req.headers.get("x-forwarded-for");
      const realIP = req.headers.get("x-real-ip");
      const cfIP = req.headers.get("cf-connecting-ip");

      if (forwarded) {
        return forwarded.split(",")[0].trim();
      }

      if (realIP) {
        return realIP;
      }

      if (cfIP) {
        return cfIP;
      }
    }

    return "unknown";
  }
}
