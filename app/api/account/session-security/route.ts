import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { error as logError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

interface SessionSecuritySettings {
  sessionTimeout: number;
  requireMfaForSensitive: boolean;
  allowConcurrentSessions: boolean;
  maxConcurrentSessions: number;
  logoutOnSuspiciousActivity: boolean;
  rememberDevices: boolean;
  deviceTrustDuration: number;
  geoLocationRestrictions: boolean;
  allowedCountries: string[];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Return default settings since these aren't in the database yet
    const settings: SessionSecuritySettings = {
      sessionTimeout: 30,
      requireMfaForSensitive: true,
      allowConcurrentSessions: true,
      maxConcurrentSessions: 5,
      logoutOnSuspiciousActivity: true,
      rememberDevices: true,
      deviceTrustDuration: 30,
      geoLocationRestrictions: false,
      allowedCountries: [],
    };

    return NextResponse.json({ settings });
  } catch (error) {
    logError("Failed to get session security settings", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const { settings }: { settings: Partial<SessionSecuritySettings> } =
      await request.json();

    // Validate settings
    if (
      settings.sessionTimeout &&
      (settings.sessionTimeout < 5 || settings.sessionTimeout > 1440)
    ) {
      return NextResponse.json(
        { message: "Session timeout must be between 5 minutes and 24 hours" },
        { status: 400 }
      );
    }

    if (settings.maxConcurrentSessions && settings.maxConcurrentSessions < 1) {
      return NextResponse.json(
        { message: "Maximum concurrent sessions must be at least 1" },
        { status: 400 }
      );
    }

    if (
      settings.deviceTrustDuration &&
      (settings.deviceTrustDuration < 1 || settings.deviceTrustDuration > 365)
    ) {
      return NextResponse.json(
        { message: "Device trust duration must be between 1 and 365 days" },
        { status: 400 }
      );
    }

    // For now, we'll just return success since the settings would need
    // to be stored in a separate table or added to the user schema
    // In a real implementation, you'd update a UserSettings table

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("Failed to update session security settings", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
