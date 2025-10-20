// Client-side Analytics Tracking
"use client";

export interface AnalyticsEvent {
  eventType: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

export interface IAnalytics {
  setUserId(userId: string): void;
  track(eventType: string, properties?: Record<string, unknown>): void;
  trackPageView(customProperties?: Record<string, unknown>): void;
  trackProductView(
    productId: string,
    productName?: string,
    categoryId?: string
  ): void;
  trackSearch(
    query: string,
    resultCount?: number,
    filters?: Record<string, unknown>
  ): void;
  trackCartEvent(
    action: "ADD_TO_CART" | "REMOVE_FROM_CART" | "CART_VIEW" | "CART_CLEAR",
    productId?: string,
    quantity?: number
  ): void;
  trackCheckoutEvent(
    step: "CHECKOUT_START" | "PAYMENT_INFO" | "REVIEW_ORDER" | "PURCHASE",
    orderValue?: number,
    paymentMethod?: string
  ): void;
  trackUserEvent(
    action: "SIGNUP" | "LOGIN" | "LOGOUT" | "PROFILE_UPDATE",
    method?: string
  ): void;
  forceFlush(): Promise<void>;
}

class ClientAnalytics implements IAnalytics {
  private sessionId: string;
  private userId?: string;
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly MAX_QUEUE_SIZE = 50;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracking();
  }

  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracking(): void {
    // Set up automatic page view tracking
    if (typeof window !== "undefined") {
      // Track initial page view
      this.trackPageView();

      // Track page visibility changes
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          this.track("SESSION_RESUME");
        } else {
          this.track("SESSION_PAUSE");
        }
      });

      // Track before page unload
      window.addEventListener("beforeunload", () => {
        this.flush(true);
      });

      // Set up periodic flushing
      this.scheduleFlush();
    }
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  public track(eventType: string, properties?: Record<string, unknown>): void {
    const event: AnalyticsEvent = {
      eventType,
      properties: {
        ...properties,
        url: window.location.href,
        path: window.location.pathname,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.eventQueue.push(event);

    // Flush immediately for important events
    if (["PURCHASE", "SIGNUP", "LOGIN"].includes(eventType)) {
      this.flush();
    } else if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flush();
    }
  }

  public trackPageView(customProperties?: Record<string, unknown>): void {
    this.track("PAGE_VIEW", {
      title: document.title,
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      ...customProperties,
    });
  }

  public trackProductView(
    productId: string,
    productName?: string,
    categoryId?: string
  ): void {
    this.track("PRODUCT_VIEW", {
      productId,
      productName,
      categoryId,
    });
  }

  public trackSearch(
    query: string,
    resultCount?: number,
    filters?: Record<string, unknown>
  ): void {
    this.track("SEARCH", {
      query,
      resultCount,
      filters,
    });
  }

  public trackCartEvent(
    action: "ADD_TO_CART" | "REMOVE_FROM_CART" | "CART_VIEW" | "CART_CLEAR",
    productId?: string,
    quantity?: number
  ): void {
    this.track(action, {
      productId,
      quantity,
    });
  }

  public trackCheckoutEvent(
    step: "CHECKOUT_START" | "PAYMENT_INFO" | "REVIEW_ORDER" | "PURCHASE",
    orderValue?: number,
    paymentMethod?: string
  ): void {
    this.track(step, {
      orderValue,
      paymentMethod,
    });
  }

  public trackUserEvent(
    action: "SIGNUP" | "LOGIN" | "LOGOUT" | "PROFILE_UPDATE",
    method?: string
  ): void {
    this.track(action, {
      method,
    });
  }

  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flush();
      this.scheduleFlush();
    }, this.FLUSH_INTERVAL);
  }

  private async flush(sync = false): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      if (sync && navigator.sendBeacon) {
        // Use sendBeacon for synchronous requests (like page unload)
        navigator.sendBeacon(
          "/api/analytics/events",
          JSON.stringify({ events })
        );
      } else {
        // Use regular fetch for async requests
        await fetch("/api/analytics/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ events }),
          keepalive: sync,
        });
      }
    } catch (error) {
      console.warn("Failed to send analytics events:", error);
      // Re-queue events on failure (up to a limit)
      if (this.eventQueue.length < this.MAX_QUEUE_SIZE) {
        this.eventQueue.unshift(
          ...events.slice(0, this.MAX_QUEUE_SIZE - this.eventQueue.length)
        );
      }
    }
  }

  public async forceFlush(): Promise<void> {
    await this.flush();
  }
}

// Global analytics instance
let analytics: ClientAnalytics | null = null;

export function getAnalytics(): IAnalytics {
  if (typeof window === "undefined") {
    // Return a no-op analytics instance for SSR
    return {
      setUserId: () => {},
      track: () => {},
      trackPageView: () => {},
      trackProductView: () => {},
      trackSearch: () => {},
      trackCartEvent: () => {},
      trackCheckoutEvent: () => {},
      trackUserEvent: () => {},
      forceFlush: async () => {},
    };
  }

  if (!analytics) {
    analytics = new ClientAnalytics();
  }

  return analytics;
}

// Convenience functions
export const track = (
  eventType: string,
  properties?: Record<string, unknown>
) => {
  getAnalytics().track(eventType, properties);
};

export const trackPageView = (customProperties?: Record<string, unknown>) => {
  getAnalytics().trackPageView(customProperties);
};

export const trackProductView = (
  productId: string,
  productName?: string,
  categoryId?: string
) => {
  getAnalytics().trackProductView(productId, productName, categoryId);
};

export const trackSearch = (
  query: string,
  resultCount?: number,
  filters?: Record<string, unknown>
) => {
  getAnalytics().trackSearch(query, resultCount, filters);
};

export const trackCartEvent = (
  action: "ADD_TO_CART" | "REMOVE_FROM_CART" | "CART_VIEW" | "CART_CLEAR",
  productId?: string,
  quantity?: number
) => {
  getAnalytics().trackCartEvent(action, productId, quantity);
};

export const trackCheckoutEvent = (
  step: "CHECKOUT_START" | "PAYMENT_INFO" | "REVIEW_ORDER" | "PURCHASE",
  orderValue?: number,
  paymentMethod?: string
) => {
  getAnalytics().trackCheckoutEvent(step, orderValue, paymentMethod);
};

export const trackUserEvent = (
  action: "SIGNUP" | "LOGIN" | "LOGOUT" | "PROFILE_UPDATE",
  method?: string
) => {
  getAnalytics().trackUserEvent(action, method);
};

export const setUserId = (userId: string) => {
  getAnalytics().setUserId(userId);
};

// React hook for analytics
import { useEffect } from "react";

export function useAnalytics(userId?: string) {
  const analytics = getAnalytics();

  useEffect(() => {
    if (userId) {
      analytics.setUserId(userId);
    }
  }, [userId, analytics]);

  return {
    track: analytics.track.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    trackProductView: analytics.trackProductView.bind(analytics),
    trackSearch: analytics.trackSearch.bind(analytics),
    trackCartEvent: analytics.trackCartEvent.bind(analytics),
    trackCheckoutEvent: analytics.trackCheckoutEvent.bind(analytics),
    trackUserEvent: analytics.trackUserEvent.bind(analytics),
  };
}
