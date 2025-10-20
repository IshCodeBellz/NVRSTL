import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import {
  trackEvent,
  trackPageView,
  trackProductView,
  trackSearch,
  trackCartEvent,
} from "@/lib/server/analyticsTracker";
import { captureError, trackPerformance } from "@/lib/server/errors";

// POST /api/analytics/events - Track analytics events
export async function POST(req: NextRequest) {
  const start = Date.now();
  const perf = trackPerformance("analytics_events_endpoint", {
    route: "/api/analytics/events",
  });

  try {
    const body = await req.json();
    const { events } = body;

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: "Events must be an array" },
        { status: 400 }
      );
    }

    // Process events in parallel (but limit to prevent overwhelming the database)
    const eventBatches = [];
    const batchSize = 10;

    for (let i = 0; i < events.length; i += batchSize) {
      eventBatches.push(events.slice(i, i + batchSize));
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const batch of eventBatches) {
      const batchPromises = batch.map(async (event) => {
        try {
          const clientIP =
            req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") ||
            req.ip ||
            "unknown";

          const userAgent = req.headers.get("user-agent") || "unknown";

          const eventData = {
            userId: event.userId || null,
            sessionId: event.sessionId || null,
            eventType: event.eventType,
            properties: event.properties || {},
            timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
            ipAddress: clientIP,
            userAgent,
            referrer: event.referrer,
          };

          // Route to appropriate tracking function based on event type
          switch (event.eventType) {
            case "PAGE_VIEW":
              await trackPageView({
                ...eventData,
                path: event.properties?.path || "/",
                title: event.properties?.title,
                duration: event.properties?.timeOnPage,
              });
              break;

            case "PRODUCT_VIEW":
              if (event.properties?.productId) {
                await trackProductView(event.properties.productId, eventData);
              } else {
                await trackEvent(eventData);
              }
              break;

            case "SEARCH":
              if (event.properties?.query) {
                await trackSearch(
                  event.properties.query,
                  event.properties?.resultCount || 0,
                  eventData
                );
              } else {
                await trackEvent(eventData);
              }
              break;

            case "ADD_TO_CART":
            case "REMOVE_FROM_CART":
            case "CART_VIEW":
              if (event.properties?.productId) {
                await trackCartEvent(
                  event.eventType as
                    | "ADD_TO_CART"
                    | "REMOVE_FROM_CART"
                    | "CART_VIEW",
                  event.properties.productId,
                  eventData
                );
              } else {
                await trackEvent(eventData);
              }
              break;

            default:
              await trackEvent(eventData);
          }

          processedCount++;
        } catch (error) {
          logger.error("Error processing event:", error);
          errorCount++;
        }
      });

      await Promise.all(batchPromises);
    }

    perf.finish("ok");
    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      total: events.length,
      timestamp: new Date().toISOString(),
      request_duration_ms: Date.now() - start,
    });
  } catch (error) {
    perf.finish("error");
    captureError(
      error instanceof Error
        ? error
        : new Error("Analytics events endpoint failed"),
      { route: "/api/analytics/events" },
      "error"
    );

    return NextResponse.json(
      {
        error: "events_processing_failed",
        message: "Failed to process analytics events",
        request_duration_ms: Date.now() - start,
      },
      { status: 500 }
    );
  }
}

// GET /api/analytics/events - Get recent events (for debugging/admin)
export async function GET(req: NextRequest) {
  const start = Date.now();
  const perf = trackPerformance("analytics_events_get", {
    route: "/api/analytics/events",
  });

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const eventType = searchParams.get("eventType");
    const userId = searchParams.get("userId");
    const sessionId = searchParams.get("sessionId");
    const since = searchParams.get("since");

    const where: Record<string, unknown> = {};

    if (eventType) where.eventType = eventType;
    if (userId) where.userId = userId;
    if (sessionId) where.sessionId = sessionId;
    if (since) where.timestamp = { gte: new Date(since) };

    const { prisma } = await import("@/lib/server/prisma");

    const events = await prisma.analyticsEvent.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
      select: {
        id: true,
        eventType: true,
        eventCategory: true,
        eventAction: true,
        eventLabel: true,
        eventValue: true,
        timestamp: true,
        userId: true,
        sessionId: true,
        productId: true,
        categoryId: true,
        metadata: true,
      },
    });

    perf.finish("ok");
    return NextResponse.json({
      events,
      count: events.length,
      timestamp: new Date().toISOString(),
      request_duration_ms: Date.now() - start,
    });
  } catch (error) {
    perf.finish("error");
    captureError(
      error instanceof Error ? error : new Error("Analytics events get failed"),
      { route: "/api/analytics/events" },
      "error"
    );

    return NextResponse.json(
      {
        error: "events_fetch_failed",
        message: "Failed to fetch analytics events",
        request_duration_ms: Date.now() - start,
      },
      { status: 500 }
    );
  }
}
