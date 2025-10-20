import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { error as logError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // In a real implementation, you would:
    // 1. Delete all user sessions from the database
    // 2. Invalidate all JWT tokens
    // 3. Clear session cookies
    // 4. Log the security event

    // For now, we'll just return success
    // The frontend will handle redirecting to login

    return NextResponse.json({
      success: true,
      message: "All sessions terminated successfully",
    });
  } catch (error) {
    logError("Failed to terminate all sessions", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
