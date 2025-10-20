// Analytics Event Tracking Service - Collects and processes analytics data
import { prisma } from "./prisma";

export interface EventData {
  userId?: string | null;
  sessionId?: string | null;
  eventType: string;
  eventCategory?: string;
  eventAction?: string;
  eventLabel?: string;
  eventValue?: number;
  productId?: string;
  categoryId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export interface PageViewData {
  userId?: string | null;
  sessionId?: string | null;
  path: string;
  title?: string;
  referrer?: string;
  duration?: number;
  timestamp?: Date;
}

export interface SessionData {
  sessionId: string;
  userId?: string | null;
  sessionToken?: string;
  startTime: Date;
  endTime?: Date;
  deviceType?: string;
  browser?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
}

export class AnalyticsTracker {
  // Track events
  static async trackEvent(data: EventData): Promise<void> {
    try {
      if (data.sessionId) {
        await prisma.analyticsEvent.create({
          data: {
            sessionId: data.sessionId,
            userId: data.userId,
            eventType: data.eventType,
            eventCategory: data.eventCategory ?? "general",
            eventAction: data.eventAction ?? "",
            eventLabel: data.eventLabel,
            eventValue: data.eventValue,
            productId: data.productId,
            categoryId: data.categoryId,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            timestamp: data.timestamp ?? new Date(),
          },
        });
      }

      // Update related analytics models based on event type
      await this.updateAnalyticsModels(data);
    } catch (error) {
      console.error("Error tracking event:", error);
    }
  }

  // Track page views
  static async trackPageView(data: PageViewData): Promise<void> {
    try {
      if (data.sessionId) {
        await prisma.pageView.create({
          data: {
            sessionId: data.sessionId,
            userId: data.userId ?? null,
            path: data.path,
            title: data.title,
            referrer: data.referrer,
            duration: data.duration,
            timestamp: data.timestamp ?? new Date(),
          },
        });
      }

      // Also record a generic event for the page view
      await this.trackEvent({
        userId: data.userId,
        sessionId: data.sessionId,
        eventType: "PAGE_VIEW",
        eventCategory: "navigation",
        eventAction: "view",
        metadata: {
          path: data.path,
          title: data.title,
          referrer: data.referrer,
          duration: data.duration,
        },
        timestamp: data.timestamp,
      });
    } catch (error) {
      console.error("Error tracking page view:", error);
    }
  }

  // Track user sessions
  static async startSession(data: SessionData): Promise<void> {
    try {
      await prisma.userSession.upsert({
        where: { sessionToken: data.sessionToken || data.sessionId },
        update: {
          deviceType: data.deviceType,
          browser: data.browser,
          ipAddress: data.ipAddress,
          country: data.country,
          city: data.city,
        },
        create: {
          sessionToken: data.sessionToken || data.sessionId,
          userId: data.userId ?? null,
          startTime: data.startTime,
          deviceType: data.deviceType,
          browser: data.browser,
          ipAddress: data.ipAddress,
          country: data.country,
          city: data.city,
        },
      });
    } catch (error) {
      console.error("Error starting session:", error);
    }
  }

  // End user session
  static async endSession(sessionId: string, endTime: Date): Promise<void> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { sessionToken: sessionId },
      });

      if (session) {
        const duration = Math.floor(
          (endTime.getTime() - session.startTime.getTime()) / 1000
        );

        await prisma.userSession.update({
          where: { sessionToken: sessionId },
          data: { endTime, duration },
        });
      }
    } catch (error) {
      console.error("Error ending session:", error);
    }
  }

  // Track product views
  static async trackProductView(
    productId: string,
    data: Partial<EventData>
  ): Promise<void> {
    try {
      // Track the event
      await this.trackEvent({
        ...data,
        eventType: "PRODUCT_VIEW",
        eventCategory: "product",
        eventAction: "view",
        productId,
      });

      // Update product metrics
      await prisma.productMetrics.upsert({
        where: { productId },
        update: { views: { increment: 1 } },
        create: { productId, views: 1 },
      });

      // Update product analytics snapshot
      await this.updateProductAnalytics(productId);
    } catch (error) {
      console.error("Error tracking product view:", error);
    }
  }

  // Update analytics models based on events
  private static async updateAnalyticsModels(data: EventData): Promise<void> {
    try {
      // Update conversion funnel based on event type
      if (
        [
          "PAGE_VIEW",
          "PRODUCT_VIEW",
          "ADD_TO_CART",
          "CHECKOUT_START",
          "PURCHASE",
        ].includes(data.eventType)
      ) {
        await this.updateConversionFunnel(data.eventType, data.sessionId);
      }

      // Update category analytics for product-related events
      if (
        ["PRODUCT_VIEW", "PRODUCT_PURCHASE"].includes(data.eventType) &&
        data.productId
      ) {
        await this.updateCategoryAnalytics(data.productId);
      }
    } catch (error) {
      console.error("Error updating analytics models:", error);
    }
  }

  // Update product analytics
  private static async updateProductAnalytics(
    productId: string
  ): Promise<void> {
    try {
      const metrics = await prisma.productMetrics.findUnique({
        where: { productId },
      });

      if (metrics) {
        const conversionRate =
          metrics.views > 0 ? (metrics.purchases / metrics.views) * 100 : 0;

        await prisma.productAnalytics.upsert({
          where: { productId },
          update: {
            viewCount: metrics.views,
            purchaseCount: metrics.purchases,
            conversionRate,
          },
          create: {
            productId,
            viewCount: metrics.views,
            purchaseCount: metrics.purchases,
            conversionRate,
          },
        });
      }
    } catch (error) {
      console.error("Error updating product analytics:", error);
    }
  }

  // Update category analytics - stub implementation
  private static async updateCategoryAnalytics(
    productId: string
  ): Promise<void> {
    try {
      // Implementation would go here
      console.log("Updating category analytics for product:", productId);
    } catch (error) {
      console.error("Error updating category analytics:", error);
    }
  }

  // Update conversion funnel - stub implementation
  private static async updateConversionFunnel(
    eventType: string,
    sessionId?: string | null
  ): Promise<void> {
    try {
      // Implementation would go here
      console.log("Updating conversion funnel:", eventType, sessionId);
    } catch (error) {
      console.error("Error updating conversion funnel:", error);
    }
  }

  // Batch process analytics (run daily via cron)
  static async processAnalytics(date: Date = new Date()): Promise<void> {
    try {
      console.log(
        "Processing analytics for date:",
        date.toISOString().split("T")[0]
      );

      // Implementation would include various analytics processing
      console.log("Analytics processing completed");
    } catch (error) {
      console.error("Error processing analytics:", error);
    }
  }
}

// Export helper functions for use in API routes
export const trackEvent = AnalyticsTracker.trackEvent.bind(AnalyticsTracker);
export const trackPageView =
  AnalyticsTracker.trackPageView.bind(AnalyticsTracker);
export const trackProductView =
  AnalyticsTracker.trackProductView.bind(AnalyticsTracker);
export const startSession =
  AnalyticsTracker.startSession.bind(AnalyticsTracker);
export const endSession = AnalyticsTracker.endSession.bind(AnalyticsTracker);
export const processAnalytics =
  AnalyticsTracker.processAnalytics.bind(AnalyticsTracker);

// Convenience helpers
export const trackSearch = async (
  query: string,
  resultCount: number,
  data: Partial<EventData>
): Promise<void> => {
  return AnalyticsTracker.trackEvent({
    ...data,
    eventType: "SEARCH",
    eventCategory: "search",
    eventAction: "query",
    metadata: { query, resultCount },
  });
};

export const trackCartEvent = async (
  eventType: string,
  productId: string,
  data: Partial<EventData>
): Promise<void> => {
  return AnalyticsTracker.trackEvent({
    ...data,
    eventType,
    eventCategory: "cart",
    productId,
  });
};
