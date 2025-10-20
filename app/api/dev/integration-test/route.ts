import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { IntegrationTestService } from "@/lib/server/integrationTestService";

export const dynamic = "force-dynamic";

/**
 * Run integration tests for database, authentication, and performance
 * GET /api/dev/integration-test
 */
export async function GET(request: NextRequest) {
  try {
    // Only allow in development or for admin users
    if (process.env.NODE_ENV === "production") {
      const session = await getServerSession(authOptionsEnhanced);
      const isAdmin = session?.user?.isAdmin;

      if (!isAdmin) {
        return NextResponse.json(
          { error: "Integration tests are only available to administrators" },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const testUserId = searchParams.get("userId");
    const testType = searchParams.get("type") || "full";

    logger.info("🧪 Starting integration tests...");
    logger.info(`📋 Test type: ${testType}`);
    if (testUserId) {
      logger.info(`👤 Test user ID: ${testUserId}`);
    }

    let testResults;

    switch (testType) {
      case "database":
        testResults = await IntegrationTestService.testDatabaseConnectivity();
        break;

      case "mfa":
        if (!testUserId) {
          return NextResponse.json(
            { error: "User ID required for MFA testing" },
            { status: 400 }
          );
        }
        testResults = await IntegrationTestService.testMFAFlow(testUserId);
        break;

      case "wishlist":
        if (!testUserId) {
          return NextResponse.json(
            { error: "User ID required for wishlist testing" },
            { status: 400 }
          );
        }
        testResults = await IntegrationTestService.testSocialWishlistFlow(
          testUserId
        );
        break;

      case "caching":
        testResults = await IntegrationTestService.testCachingPerformance();
        break;

      case "analytics":
        if (!testUserId) {
          return NextResponse.json(
            { error: "User ID required for analytics testing" },
            { status: 400 }
          );
        }
        testResults = await IntegrationTestService.testAnalyticsTracking(
          testUserId
        );
        break;

      case "full":
      default:
        testResults = await IntegrationTestService.runFullIntegrationTest(
          testUserId || undefined
        );
        break;
    }

    const responseData = {
      success: testResults.success,
      testType,
      timestamp: new Date().toISOString(),
      ...(testType === "full"
        ? {
            summary: (testResults as Record<string, unknown>).summary,
            details: (testResults as Record<string, unknown>).details,
          }
        : {
            results: (testResults as Record<string, unknown>).results,
          }),
      ...(testResults.errors &&
        testResults.errors.length > 0 && {
          errors: testResults.errors,
        }),
    };

    // Log results to console for debugging
    logger.info("✅ Integration test results:");
    logger.info(JSON.stringify(responseData, null, 2));

    return NextResponse.json(responseData);
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Integration test API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run integration tests",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Get integration test status and available tests
 * OPTIONS /api/dev/integration-test
 */
export async function OPTIONS() {
  return NextResponse.json({
    availableTests: [
      {
        type: "full",
        description: "Run all integration tests",
        requiresUserId: false,
        note: "Some tests will be skipped without user ID",
      },
      {
        type: "database",
        description: "Test database connectivity and basic operations",
        requiresUserId: false,
      },
      {
        type: "mfa",
        description: "Test MFA authentication flows",
        requiresUserId: true,
      },
      {
        type: "wishlist",
        description: "Test social wishlist functionality",
        requiresUserId: true,
      },
      {
        type: "caching",
        description: "Test caching and performance optimizations",
        requiresUserId: false,
      },
      {
        type: "analytics",
        description: "Test analytics and behavior tracking",
        requiresUserId: true,
      },
    ],
    usage: {
      endpoint: "/api/dev/integration-test",
      parameters: {
        type: "Test type to run (default: full)",
        userId: "User ID for user-specific tests (optional)",
      },
      examples: [
        "/api/dev/integration-test",
        "/api/dev/integration-test?type=database",
        "/api/dev/integration-test?type=full&userId=user_123",
      ],
    },
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
