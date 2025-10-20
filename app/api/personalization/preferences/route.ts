import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { PersonalizationService } from "@/lib/server/personalizationService";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Mock user ID since session.user.id not available
    const mockUserId = session.user.email || "user_123";

    const preferences = await PersonalizationService.getUserPreferences(
      mockUserId
    );

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("User preferences API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get user preferences",
      },
      { status: 500 }
    );
  }
}
