import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { SecurityService } from "@/lib/server/securityService";
import { error as logError } from "@/lib/server/logger";
import { IPSecurityService } from "@/lib/server/ipSecurity";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const userId = session.user.id;

    // Get all recent security events (we'll filter for user later)
    const allEvents = await SecurityService.getRecentSecurityEvents(100);

    // Filter events for current user and add location data
    const userEvents = await Promise.all(
      allEvents
        .filter((event) => event.userId === userId)
        .slice(0, limit)
        .map(async (event) => {
          let location = event.location || "Unknown Location";

          // If no location stored but we have IP, try to get location
          if (
            !event.location &&
            event.ipAddress &&
            event.ipAddress !== "Unknown"
          ) {
            try {
              const geoData = await IPSecurityService.getGeoLocation(
                event.ipAddress
              );
              if (geoData && geoData.city !== "Unknown") {
                location = `${geoData.city}, ${geoData.region}`;
                if (geoData.country && geoData.country !== "Unknown") {
                  location += `, ${geoData.country}`;
                }
              }
            } catch (error) {
              logError("Failed to get location for event", {
                err: error instanceof Error ? error.message : String(error),
              });
            }
          }

          // Format event type for display
          const getEventDisplayName = (eventType: string) => {
            switch (eventType) {
              case "MFA_VERIFICATION_SUCCESS":
                return "Two-factor authentication enabled";
              case "MFA_VERIFICATION_FAILED":
                return "Failed two-factor authentication attempt";
              case "MFA_ENABLED":
                return "Two-factor authentication enabled";
              case "MFA_DISABLED":
                return "Two-factor authentication disabled";
              case "MFA_BACKUP_CODE_USED":
                return "Backup code used for authentication";
              case "PASSWORD_CHANGED":
                return "Password changed";
              case "ACCOUNT_LOCKED":
                return "Account locked due to suspicious activity";
              case "ACCOUNT_UNLOCKED":
                return "Account unlocked";
              case "SUSPICIOUS_LOGIN":
                return "Suspicious login detected";
              case "DEVICE_TRUSTED":
                return "Device marked as trusted";
              case "DEVICE_UNTRUSTED":
                return "Device removed from trusted list";
              case "LOGIN_SUCCESS":
                return "Successful login";
              case "LOGIN_FAILED":
                return "Failed login attempt";
              default:
                return eventType
                  .replace(/_/g, " ")
                  .toLowerCase()
                  .replace(/\b\w/g, (l) => l.toUpperCase());
            }
          };

          return {
            id: event.id,
            type: event.eventType,
            displayName: getEventDisplayName(event.eventType),
            details: event.details,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            location,
            timestamp: event.timestamp,
            severity: event.severity,
            blocked: event.blocked,
            resolved: event.resolved,
          };
        })
    );

    // If no events found, create some recent activity based on current session
    if (userEvents.length === 0) {
      const currentIP = IPSecurityService.extractIP(request);
      let currentLocation = "Unknown Location";

      try {
        const geoData = await IPSecurityService.getGeoLocation(currentIP);
        if (geoData && geoData.city !== "Unknown") {
          currentLocation = `${geoData.city}, ${geoData.region}`;
          if (geoData.country && geoData.country !== "Unknown") {
            currentLocation += `, ${geoData.country}`;
          }
        }
      } catch (error) {
        logError("Failed to get current location", {
          err: error instanceof Error ? error.message : String(error),
        });
      }

      // Add current login event
      userEvents.push({
        id: "current-login",
        type: "LOGIN_SUCCESS",
        displayName: "Successful login",
        details: { source: "current_session" },
        ipAddress: currentIP,
        userAgent: request.headers.get("user-agent") || undefined,
        location: currentLocation,
        timestamp: new Date(),
        severity: "low" as const,
        blocked: false,
        resolved: true,
      });
    }

    return NextResponse.json({
      events: userEvents,
      total: userEvents.length,
      hasMore: userEvents.length === limit,
    });
  } catch (error) {
    logError("Failed to get security events", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { message: "Failed to retrieve security events" },
      { status: 500 }
    );
  }
}
