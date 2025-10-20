import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { error as logError } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";
import { generateDeviceFingerprint } from "@/lib/security";
import { IPSecurityService } from "@/lib/server/ipSecurity";

export const dynamic = "force-dynamic";

// Helper function to parse user agent and get device info
function parseUserAgent(userAgent?: string) {
  if (!userAgent)
    return {
      browser: "Unknown",
      os: "Unknown",
      deviceName: "Unknown Device",
      type: "desktop" as const,
    };

  const ua = userAgent.toLowerCase();

  // Detect OS
  let os = "Unknown";
  if (ua.includes("mac os x") || ua.includes("macos")) os = "macOS";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad"))
    os = "iOS";

  // Detect browser
  let browser = "Unknown";
  if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("edg")) browser = "Edge";
  else if (ua.includes("opera")) browser = "Opera";

  // Detect device type and name
  let type: "desktop" | "mobile" | "tablet" = "desktop";
  let deviceName = `${os} Device`;

  if (
    ua.includes("mobile") ||
    ua.includes("android") ||
    ua.includes("iphone")
  ) {
    type = "mobile";
    if (ua.includes("iphone")) deviceName = "iPhone";
    else if (ua.includes("android")) deviceName = "Android Phone";
    else deviceName = "Mobile Device";
  } else if (ua.includes("tablet") || ua.includes("ipad")) {
    type = "tablet";
    if (ua.includes("ipad")) deviceName = "iPad";
    else deviceName = "Tablet";
  } else if (ua.includes("mac")) {
    deviceName = "Mac";
  } else if (ua.includes("windows")) {
    deviceName = "Windows PC";
  }

  return { browser, os, deviceName, type };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Get current request info for identifying current session
    const currentIP = IPSecurityService.extractIP(request);
    const currentUserAgent = request.headers.get("user-agent") || "";

    // Get real user sessions from database
    const userSessions = await prisma.userSession.findMany({
      where: {
        userId: session.user.id,
        endTime: null, // Only active sessions
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 20, // Limit to last 20 sessions
    });

    // Load trusted devices for this user and build a lookup set
    const trustedDevices = await prisma.trustedDevice.findMany({
      where: { userId: session.user.id, trusted: true },
      select: { deviceId: true },
    });
    const trustedSet = new Set(trustedDevices.map((d) => d.deviceId));

    // Transform database sessions to API format
    const sessions = await Promise.all(
      userSessions.map(async (dbSession) => {
        const deviceInfo = parseUserAgent(dbSession.userAgent || undefined);
        let location = "Unknown Location";

        // Get location for this session's IP
        if (dbSession.ipAddress) {
          try {
            const geoData = await IPSecurityService.getGeoLocation(
              dbSession.ipAddress
            );
            if (geoData && geoData.city !== "Unknown") {
              location = `${geoData.city}, ${geoData.region}`;
              if (geoData.country && geoData.country !== "Unknown") {
                location += `, ${geoData.country}`;
              }
            }
          } catch (error) {
            logError("Failed to get location for session", {
              err: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // Determine if this is the current session
        const isCurrent =
          dbSession.ipAddress === currentIP &&
          dbSession.userAgent === currentUserAgent;

        // Compute device fingerprint to check trusted state
        const fingerprint = generateDeviceFingerprint(
          dbSession.userAgent || "unknown",
          dbSession.ipAddress || "unknown"
        );
        const isTrusted = trustedSet.has(fingerprint);

        // Calculate risk score based on session data
        let riskScore = 10; // Base score
        if (
          dbSession.ipAddress &&
          !IPSecurityService.isPrivateIP(dbSession.ipAddress)
        ) {
          riskScore += 10;
        }
        if (location.includes("Unknown")) riskScore += 15;

        return {
          id: dbSession.id,
          name: deviceInfo.deviceName,
          type: deviceInfo.type,
          browser: `${deviceInfo.browser} ${dbSession.browser || ""}`.trim(),
          os: deviceInfo.os,
          location,
          ipAddress: dbSession.ipAddress || "Unknown",
          lastActive: dbSession.updatedAt,
          isCurrent,
          isActive: true, // All sessions without endTime are active
          riskScore: Math.min(riskScore, 100),
          isTrusted,
          firstSeen: dbSession.startTime,
        };
      })
    );

    // If no sessions found, create a current session entry
    if (sessions.length === 0) {
      const currentDeviceInfo = parseUserAgent(currentUserAgent);
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

      const fingerprint = generateDeviceFingerprint(
        currentUserAgent || "unknown",
        currentIP || "unknown"
      );
      const isTrusted = trustedSet.has(fingerprint);
      sessions.push({
        id: "current",
        name: currentDeviceInfo.deviceName,
        type: currentDeviceInfo.type,
        browser: currentDeviceInfo.browser,
        os: currentDeviceInfo.os,
        location: currentLocation,
        ipAddress: currentIP,
        lastActive: new Date(),
        isCurrent: true,
        isActive: true,
        riskScore: IPSecurityService.isPrivateIP(currentIP) ? 5 : 25,
        isTrusted,
        firstSeen: new Date(),
      });
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    logError("Failed to get sessions", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { message: "Session ID is required" },
        { status: 400 }
      );
    }

    // End the selected session by setting endTime
    await prisma.userSession.updateMany({
      where: { id: sessionId, userId: session.user.id, endTime: null },
      data: { endTime: new Date(), updatedAt: new Date() },
    });

    // Optional: log a security event for session termination
    try {
      await prisma.securityEvent.create({
        data: {
          userId: session.user.id,
          ipAddress: request.headers.get("x-forwarded-for") || "Unknown",
          userAgent: request.headers.get("user-agent") || undefined,
          eventType: "SESSION_TERMINATED",
          severity: "low",
          details: JSON.stringify({ sessionId }),
          blocked: false,
        },
      });
    } catch {
      // Non-critical; ignore logging errors
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("Failed to terminate session", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
