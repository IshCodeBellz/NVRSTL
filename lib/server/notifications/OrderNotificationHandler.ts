import { NotificationService } from "./NotificationService";
import { OrderEventService } from "../orderEventService";
import { prisma } from "../prisma";
import { OrderStatus } from "@/lib/status";

export interface OrderStatusChangeContext {
  orderId: string;
  fromStatus?: string;
  toStatus: string;
  adminUserId?: string;
  reason?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: Date;
}

/**
 * Order Notification Handler
 * Automatically sends appropriate notifications when order status changes
 */
export class OrderNotificationHandler {
  /**
   * Handle order status change and send appropriate notifications
   */
  static async handleOrderStatusChange(
    context: OrderStatusChangeContext
  ): Promise<void> {
    try {
      const { orderId, toStatus, trackingNumber, carrier, estimatedDelivery } =
        context;

      // Get order details for context
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: { email: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              // We'll need product details for some notifications
            },
          },
        },
      });

      if (!order || !order.user?.email) {
        console.warn(
          `Cannot send notification for order ${orderId}: missing order or user email`
        );
        return;
      }

      // Prepare additional variables based on status
      const additionalVariables: Record<string, string | number> = {};

      switch (toStatus) {
        case OrderStatus.AWAITING_PAYMENT:
          // Checkout flow already sends the rich order confirmation.
          // Avoid duplicate emails here.
          break;

        case OrderStatus.PAID:
          // Payment receipt is sent by the webhook handler; avoid duplicate here.
          // Still send processing notification to keep customer informed.
          await this.sendOrderProcessing(orderId);
          break;

        case OrderStatus.FULFILLING:
          // Send order processing notification
          await this.sendOrderProcessing(orderId, {
            expectedShipping: this.calculateExpectedShipping(),
          });
          break;

        case OrderStatus.SHIPPED:
          // Send shipping notification
          if (trackingNumber && carrier) {
            additionalVariables.trackingNumber = trackingNumber;
            additionalVariables.carrier = carrier;
            additionalVariables.deliveryDate = estimatedDelivery
              ? this.formatDate(estimatedDelivery)
              : "2-3 business days";
            additionalVariables.carrierTrackingUrl = this.getCarrierTrackingUrl(
              carrier,
              trackingNumber
            );

            await this.sendOrderShipped(orderId, additionalVariables);
          }
          break;

        case OrderStatus.DELIVERED:
          // Send delivery confirmation
          additionalVariables.deliveryDate = this.formatDate(new Date());
          additionalVariables.deliveryAddress = await this.getDeliveryAddress(
            orderId
          );
          additionalVariables.reviewUrl = `${process.env.NEXTAUTH_URL}/account/orders/${orderId}/review`;

          await this.sendOrderDelivered(orderId, additionalVariables);
          break;

        case OrderStatus.CANCELLED:
          // Send cancellation notification
          additionalVariables.cancellationDate = this.formatDate(new Date());
          additionalVariables.cancellationReason =
            context.reason || "Customer request";

          await this.sendOrderCancelled(orderId, additionalVariables);
          break;

        default:
          console.log(`No notification template for status: ${toStatus}`);
      }

      // Log the notification event
      await OrderEventService.createEvent({
        orderId,
        kind: "NOTIFICATION_TRIGGERED",
        message: `Status change notification sent: ${toStatus}`,
        metadata: {
          fromStatus: context.fromStatus,
          toStatus: context.toStatus,
          adminUserId: context.adminUserId,
        },
      });
    } catch (error) {
      console.error(
        `Failed to handle order status change for ${context.orderId}:`,
        error
      );

      // Log the error but don't throw - notification failures shouldn't break order processing
      await OrderEventService.createEvent({
        orderId: context.orderId,
        kind: "NOTIFICATION_ERROR",
        message: `Notification failed for status change: ${context.toStatus}`,
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
          toStatus: context.toStatus,
        },
      }).catch(console.error);
    }
  }

  /**
   * Send order confirmation notification
   */
  private static async sendOrderConfirmation(orderId: string): Promise<void> {
    const deliveryEstimate = this.calculateDeliveryEstimate();

    await NotificationService.sendOrderNotification(
      orderId,
      "ORDER_CONFIRMATION",
      {
        deliveryEstimate,
      }
    );
  }

  /**
   * Send payment confirmation notification
   */
  private static async sendPaymentConfirmation(orderId: string): Promise<void> {
    // For now, we'll use the order confirmation template
    // In the future, we could create a separate payment confirmation template
    await NotificationService.sendOrderNotification(
      orderId,
      "ORDER_CONFIRMATION"
    );
  }

  /**
   * Send order processing notification
   */
  private static async sendOrderProcessing(
    orderId: string,
    variables: Record<string, string | number> = {}
  ): Promise<void> {
    const defaultVariables = {
      expectedShipping:
        variables.expectedShipping || this.calculateExpectedShipping(),
    };

    await NotificationService.sendOrderNotification(
      orderId,
      "ORDER_PROCESSING",
      {
        ...defaultVariables,
        ...variables,
      }
    );
  }

  /**
   * Send order shipped notification
   */
  private static async sendOrderShipped(
    orderId: string,
    variables: Record<string, string | number>
  ): Promise<void> {
    await NotificationService.sendOrderNotification(
      orderId,
      "ORDER_SHIPPED",
      variables
    );
  }

  /**
   * Send order delivered notification
   */
  private static async sendOrderDelivered(
    orderId: string,
    variables: Record<string, string | number>
  ): Promise<void> {
    await NotificationService.sendOrderNotification(
      orderId,
      "ORDER_DELIVERED",
      variables
    );
  }

  /**
   * Send order cancelled notification
   */
  private static async sendOrderCancelled(
    orderId: string,
    variables: Record<string, string | number>
  ): Promise<void> {
    await NotificationService.sendOrderNotification(
      orderId,
      "ORDER_CANCELLED",
      variables
    );
  }

  /**
   * Send payment failure notification to customer
   */
  static async sendPaymentFailureNotification(
    orderId: string,
    failureReason: string = "Payment processing failed"
  ): Promise<void> {
    try {
      const paymentUpdateUrl = `${process.env.NEXTAUTH_URL}/account/orders/${orderId}/payment`;
      const supportUrl = `${process.env.NEXTAUTH_URL}/support`;

      await NotificationService.sendOrderNotification(
        orderId,
        "PAYMENT_FAILED",
        {
          failureReason,
          paymentUpdateUrl,
          supportUrl,
        }
      );

      // Log the payment failure notification
      await OrderEventService.createEvent({
        orderId,
        kind: "PAYMENT_FAILURE_NOTIFIED",
        message: "Customer notified of payment failure",
        metadata: {
          failureReason,
          notificationSent: true,
        },
      });
    } catch (error) {
      console.error(
        `Failed to send payment failure notification for order ${orderId}:`,
        error
      );
    }
  }

  /**
   * Send admin notifications for critical events
   */
  static async sendAdminAlert(
    type: "LOW_STOCK" | "HIGH_VALUE_ORDER" | "PAYMENT_FAILURE",
    context: Record<string, unknown>
  ): Promise<void> {
    try {
      const adminEmails = await this.getAdminEmails();

      if (adminEmails.length === 0) {
        console.warn("No admin emails configured for alerts");
        return;
      }

      let template: string;
      const variables: Record<string, string | number> = {};

      switch (type) {
        case "LOW_STOCK":
          template = "LOW_STOCK_ALERT";
          Object.assign(variables, context);
          break;

        case "HIGH_VALUE_ORDER":
          template = "ORDER_CONFIRMATION"; // Placeholder - would need specific template
          Object.assign(variables, context);
          break;

        case "PAYMENT_FAILURE":
          template = "PAYMENT_FAILED"; // Placeholder - would need admin-specific template
          Object.assign(variables, context);
          break;

        default:
          console.warn(`Unknown admin alert type: ${type}`);
          return;
      }

      // Send to all admin emails
      for (const email of adminEmails) {
        await NotificationService.sendNotification({
          template,
          recipient: { email },
          channels: { email: true },
          variables,
          context: { customData: context },
          priority: "HIGH",
        });
      }
    } catch (error) {
      console.error(`Failed to send admin alert (${type}):`, error);
    }
  }

  /**
   * Calculate expected delivery estimate
   */
  private static calculateDeliveryEstimate(): string {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3); // Default 3 days
    return this.formatDate(deliveryDate);
  }

  /**
   * Calculate expected shipping date
   */
  private static calculateExpectedShipping(): string {
    const shippingDate = new Date();
    shippingDate.setDate(shippingDate.getDate() + 1); // Next business day
    return this.formatDate(shippingDate);
  }

  /**
   * Get carrier tracking URL
   */
  private static getCarrierTrackingUrl(
    carrier: string,
    trackingNumber: string
  ): string {
    const trackingUrls: Record<string, string> = {
      "Royal Mail": `https://www.royalmail.com/track-your-item#/tracking-results/${trackingNumber}`,
      DPD: `https://www.dpd.co.uk/apps/tracking/?reference=${trackingNumber}`,
      FedEx: `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`,
      UPS: `https://www.ups.com/track?tracknum=${trackingNumber}`,
      DHL: `https://www.dhl.com/gb-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`,
    };

    return trackingUrls[carrier] || `#tracking-${trackingNumber}`;
  }

  /**
   * Get delivery address for order
   */
  private static async getDeliveryAddress(orderId: string): Promise<string> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          shippingAddress: true,
        },
      });

      if (!order?.shippingAddress) return "Your address";

      const address = order.shippingAddress;
      const addressParts = [
        address.line1,
        address.city,
        address.postalCode,
      ].filter(Boolean);

      return addressParts.join(", ") || "Your address";
    } catch (error) {
      console.error("Failed to get delivery address:", error);
      return "Your address";
    }
  }

  /**
   * Format date for display
   */
  private static formatDate(date: Date): string {
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  /**
   * Get admin email addresses
   */
  private static async getAdminEmails(): Promise<string[]> {
    try {
      const adminUsers = await prisma.user.findMany({
        where: { isAdmin: true },
        select: { email: true },
      });

      return adminUsers.map((user) => user.email);
    } catch (error) {
      console.error("Failed to get admin emails:", error);
      return [];
    }
  }

  /**
   * Integration point for order status updates
   * Call this from your order management system
   */
  static async notifyOrderStatusChange(
    orderId: string,
    newStatus: OrderStatus,
    options: {
      fromStatus?: OrderStatus;
      adminUserId?: string;
      reason?: string;
      trackingNumber?: string;
      carrier?: string;
      estimatedDelivery?: Date;
    } = {}
  ): Promise<void> {
    await this.handleOrderStatusChange({
      orderId,
      fromStatus: options.fromStatus,
      toStatus: newStatus,
      adminUserId: options.adminUserId,
      reason: options.reason,
      trackingNumber: options.trackingNumber,
      carrier: options.carrier,
      estimatedDelivery: options.estimatedDelivery,
    });
  }
}
