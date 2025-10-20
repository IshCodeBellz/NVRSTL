import { OrderEventKind } from "@/lib/status";
import { prisma } from "@/lib/server/prisma";
import type { Order, OrderEvent } from "@prisma/client";

// Enhanced event metadata interfaces
export interface OrderEventMetadata {
  // Common fields
  userId?: string;
  adminUserId?: string;
  timestamp?: string;
  ipAddress?: string;
  userAgent?: string;

  // Payment-specific
  paymentId?: string;
  paymentProvider?: string;
  paymentAmount?: number;
  paymentCurrency?: string;
  paymentFailureReason?: string;

  // Order pricing fields
  subtotalCents?: number;
  discountCents?: number;
  taxCents?: number;
  shippingCents?: number;
  totalCents?: number;
  discountApplied?: boolean;

  // Discount-specific
  discountCode?: string;
  discountValueCents?: number;
  discountPercent?: number;
  totalDiscountCents?: number;

  // Stock-specific
  stockOperations?: {
    productId: string;
    sizeId: string;
    quantity: number;
    previousStock: number;
    newStock: number;
    operation: "decrement" | "restore" | "adjust";
  }[];
  totalQuantity?: number;

  // Status change specific
  previousStatus?: string;
  newStatus?: string;
  statusChangeReason?: string;
  fromStatus?: string;
  toStatus?: string;

  // Notification specific
  template?: string;
  failureReason?: string;
  error?: string;
  channels?: Record<string, unknown>;

  // Shipping specific
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;

  // Fulfillment specific
  pickingListId?: string;
  warehouseZone?: string;
  priority?: string;
  estimatedPickTime?: number;
  itemCount?: number;
  pickedBy?: string;
  packedBy?: string;
  packages?: unknown[];
  specialInstructions?: string;
  pickedItems?: unknown[];
  completedAt?: string;
  packedAt?: string;
  service?: string;

  // Tracking and delivery specific
  location?: string;
  deliveredAt?: string;
  signedBy?: string;
  deliveryLocation?: string;
  proofOfDelivery?: string;
  deliveryNotes?: string;
  deliveryDescription?: string;

  // System specific
  systemEvent?: string;
  retryAttempt?: number;
  errorDetails?: string;

  // Notification specific
  notificationSent?: boolean;
  notificationMethod?: "email" | "sms" | "push";
  notificationId?: string;
  notificationType?: string;
}

export interface OrderEventCreateData {
  orderId: string;
  kind: string;
  message: string;
  metadata?: OrderEventMetadata;
  userId?: string;
  adminUserId?: string;
}

export interface NotificationConfig {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  adminNotification?: boolean;
  customerNotification?: boolean;
}

export class OrderEventService {
  /**
   * Create a comprehensive order event with enhanced metadata
   */
  static async createEvent(data: OrderEventCreateData): Promise<OrderEvent> {
    const enhancedMetadata: OrderEventMetadata = {
      ...data.metadata,
      timestamp: new Date().toISOString(),
      userId: data.userId,
      adminUserId: data.adminUserId,
    };

    const event = await prisma.orderEvent.create({
      data: {
        orderId: data.orderId,
        kind: data.kind,
        message: data.message,
        meta: JSON.stringify(enhancedMetadata),
      },
    });

    // Trigger notifications for critical events
    await this.handleEventNotifications(event, enhancedMetadata);

    return event;
  }

  /**
   * Create payment-related events with enhanced tracking
   */
  static async createPaymentEvent(
    orderId: string,
    kind: "PAYMENT_ATTEMPT" | "PAYMENT_SUCCEEDED" | "PAYMENT_FAILED",
    paymentData: {
      paymentId: string;
      amount: number;
      currency: string;
      provider: string;
      failureReason?: string;
    }
  ): Promise<OrderEvent> {
    const message = this.generatePaymentMessage(kind, paymentData);

    return this.createEvent({
      orderId,
      kind,
      message,
      metadata: {
        paymentId: paymentData.paymentId,
        paymentProvider: paymentData.provider,
        paymentAmount: paymentData.amount,
        paymentCurrency: paymentData.currency,
        paymentFailureReason: paymentData.failureReason,
      },
    });
  }

  /**
   * Create stock operation events with detailed tracking
   */
  static async createStockEvent(
    orderId: string,
    kind: "STOCK_RESERVED" | "STOCK_RESTORED" | "STOCK_ADJUSTED",
    stockOperations: OrderEventMetadata["stockOperations"],
    reason?: string
  ): Promise<OrderEvent> {
    const message = this.generateStockMessage(kind, stockOperations, reason);

    return this.createEvent({
      orderId,
      kind,
      message,
      metadata: {
        stockOperations,
        statusChangeReason: reason,
      },
    });
  }

  /**
   * Create order status change events with validation
   */
  static async createStatusChangeEvent(
    orderId: string,
    previousStatus: string,
    newStatus: string,
    reason?: string,
    adminUserId?: string
  ): Promise<OrderEvent> {
    const message = `Order status changed from ${previousStatus} to ${newStatus}${
      reason ? `: ${reason}` : ""
    }`;

    return this.createEvent({
      orderId,
      kind: "ORDER_STATUS_CHANGED",
      message,
      metadata: {
        previousStatus,
        newStatus,
        statusChangeReason: reason,
      },
      adminUserId,
    });
  }

  /**
   * Create shipping events with tracking information
   */
  static async createShippingEvent(
    orderId: string,
    kind: "ORDER_SHIPPED" | "ORDER_DELIVERED",
    shippingData: {
      trackingNumber?: string;
      carrier?: string;
      estimatedDelivery?: string;
    }
  ): Promise<OrderEvent> {
    const message = this.generateShippingMessage(kind, shippingData);

    return this.createEvent({
      orderId,
      kind,
      message,
      metadata: {
        trackingNumber: shippingData.trackingNumber,
        carrier: shippingData.carrier,
        estimatedDelivery: shippingData.estimatedDelivery,
      },
    });
  }

  /**
   * Create system events for automated processes
   */
  static async createSystemEvent(
    orderId: string,
    systemEvent: string,
    details?: {
      retryAttempt?: number;
      errorDetails?: string;
      operation?: string;
    }
  ): Promise<OrderEvent> {
    return this.createEvent({
      orderId,
      kind: "SYSTEM_EVENT",
      message: `System event: ${systemEvent}`,
      metadata: {
        systemEvent,
        retryAttempt: details?.retryAttempt,
        errorDetails: details?.errorDetails,
      },
    });
  }

  /**
   * Get enhanced order event history with parsed metadata
   */
  static async getOrderEvents(
    orderId: string
  ): Promise<(OrderEvent & { parsedMeta?: OrderEventMetadata })[]> {
    const events = await prisma.orderEvent.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });

    return events.map((event) => ({
      ...event,
      parsedMeta: event.meta
        ? this.parseEventMetadata(event.meta) || undefined
        : undefined,
    }));
  }

  /**
   * Get critical events that require attention
   */
  static async getCriticalEvents(
    limit = 50
  ): Promise<(OrderEvent & { order: Order })[]> {
    const criticalKinds = [
      OrderEventKind.PAYMENT_FAILED,
      "STOCK_SHORTAGE",
      "SYSTEM_ERROR",
      "WEBHOOK_FAILURE",
    ];

    return prisma.orderEvent.findMany({
      where: {
        kind: { in: criticalKinds },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
      include: { order: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Generate analytics for order events
   */
  static async getEventAnalytics(
    orderId?: string,
    timeRange?: { start: Date; end: Date }
  ) {
    const where: Record<string, unknown> = {};

    if (orderId) where.orderId = orderId;
    if (timeRange) {
      where.createdAt = {
        gte: timeRange.start,
        lte: timeRange.end,
      };
    }

    const eventCounts = await prisma.orderEvent.groupBy({
      by: ["kind"],
      where,
      _count: { kind: true },
    });

    const totalEvents = await prisma.orderEvent.count({ where });

    return {
      totalEvents,
      eventsByType: eventCounts.reduce((acc, item) => {
        acc[item.kind] = item._count.kind;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // Private helper methods

  private static generatePaymentMessage(
    kind: string,
    paymentData: {
      amount: number;
      currency: string;
      provider: string;
      failureReason?: string;
    }
  ): string {
    const amount = `${paymentData.currency} ${(
      paymentData.amount / 100
    ).toFixed(2)}`;

    switch (kind) {
      case "PAYMENT_ATTEMPT":
        return `Payment attempt for ${amount} via ${paymentData.provider}`;
      case "PAYMENT_SUCCEEDED":
        return `Payment successful: ${amount} via ${paymentData.provider}`;
      case "PAYMENT_FAILED":
        return `Payment failed: ${amount} via ${paymentData.provider}${
          paymentData.failureReason ? ` (${paymentData.failureReason})` : ""
        }`;
      default:
        return `Payment event: ${kind}`;
    }
  }

  private static generateStockMessage(
    kind: string,
    stockOps?: OrderEventMetadata["stockOperations"],
    reason?: string
  ): string {
    const opsCount = stockOps?.length || 0;
    const totalQuantity =
      stockOps?.reduce((sum, op) => sum + op.quantity, 0) || 0;

    switch (kind) {
      case "STOCK_RESERVED":
        return `Reserved ${totalQuantity} items across ${opsCount} variants`;
      case "STOCK_RESTORED":
        return `Restored ${totalQuantity} items to inventory${
          reason ? ` (${reason})` : ""
        }`;
      case "STOCK_ADJUSTED":
        return `Adjusted stock for ${opsCount} variants${
          reason ? ` (${reason})` : ""
        }`;
      default:
        return `Stock operation: ${kind}`;
    }
  }

  private static generateShippingMessage(
    kind: string,
    shippingData: { trackingNumber?: string; carrier?: string }
  ): string {
    switch (kind) {
      case "ORDER_SHIPPED":
        return `Order shipped${
          shippingData.carrier ? ` via ${shippingData.carrier}` : ""
        }${
          shippingData.trackingNumber
            ? ` (Tracking: ${shippingData.trackingNumber})`
            : ""
        }`;
      case "ORDER_DELIVERED":
        return `Order delivered successfully`;
      default:
        return `Shipping event: ${kind}`;
    }
  }

  private static parseEventMetadata(
    metaString: string
  ): OrderEventMetadata | null {
    try {
      return JSON.parse(metaString) as OrderEventMetadata;
    } catch {
      return null;
    }
  }

  private static async handleEventNotifications(
    event: OrderEvent,
    metadata: OrderEventMetadata
  ): Promise<void> {
    // Define critical events that require immediate notification
    const criticalEvents = [
      OrderEventKind.PAYMENT_FAILED,
      "STOCK_SHORTAGE",
      "SYSTEM_ERROR",
      "WEBHOOK_FAILURE",
    ];

    if (!criticalEvents.includes(event.kind)) {
      return;
    }

    try {
      // Log notification attempt
      console.log(
        `Critical event notification: ${event.kind} for order ${event.orderId}`
      );

      // Here you would integrate with actual notification services
      // For now, we'll just log and potentially create a follow-up event
      await prisma.orderEvent.create({
        data: {
          orderId: event.orderId,
          kind: "NOTIFICATION_SENT",
          message: `Notification sent for critical event: ${event.kind}`,
          meta: JSON.stringify({
            ...metadata,
            notificationSent: true,
            notificationMethod: "system_log",
            originalEventId: event.id,
          }),
        },
      });
    } catch (error) {
      console.error("Failed to send notification for critical event:", error);
    }
  }
}
