import { prisma } from "@/lib/server/prisma";
import { getMailer } from "@/lib/server/mailer";
import { OrderEventService } from "@/lib/server/orderEventService";
import {
  buildRichOrderConfirmationHtml,
  buildRichOrderConfirmationText,
  type OrderEmailLine,
  type RichOrderEmailPayload,
} from "@/lib/server/mailer";
import { formatPriceCents } from "@/lib/money";
import type { JerseyCustomization } from "@/lib/types";

export interface NotificationChannel {
  email?: boolean;
  sms?: boolean;
  inApp?: boolean;
  push?: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  textContent: string;
  htmlContent: string;
  smsContent?: string;
  variables: string[];
}

export interface NotificationContext {
  userId?: string;
  orderId?: string;
  productId?: string;
  adminUserId?: string;
  customData?: Record<string, unknown>;
}

export interface NotificationDelivery {
  id: string;
  templateId: string;
  channels: NotificationChannel;
  status: "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "CANCELLED";
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  retryCount: number;
}

export interface SendNotificationOptions {
  template: string;
  recipient: {
    email?: string;
    phone?: string;
    userId?: string;
  };
  channels: NotificationChannel;
  variables: Record<string, string | number>;
  context: NotificationContext;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  scheduleAt?: Date;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number; // milliseconds
  };
}

/**
 * Comprehensive Notification Service
 * Handles email, SMS, in-app, and push notifications with delivery tracking
 */
export class NotificationService {
  private static readonly DEFAULT_RETRY_POLICY = {
    maxRetries: 3,
    retryDelay: 300000, // 5 minutes
  };

  private static readonly TEMPLATES: Record<string, NotificationTemplate> = {
    ORDER_CONFIRMATION: {
      id: "ORDER_CONFIRMATION",
      name: "Order Confirmation",
      subject: "Order Confirmation #{{orderNumber}}",
      textContent: `{{orderText}}`,
      htmlContent: `{{orderHtml}}`,
      smsContent:
        "Order #{{orderNumber}} confirmed! Total: {{currency}}{{totalAmount}}. Track: {{trackingUrl}}",
      variables: [
        "orderNumber",
        "currency",
        "totalAmount",
        "totalFormatted",
        "deliveryEstimate",
        "trackingUrl",
        "orderHtml",
        "orderText",
      ],
    },

    ORDER_PROCESSING: {
      id: "ORDER_PROCESSING",
      name: "Order Processing",
      subject: "Your order #{{orderNumber}} is being prepared",
      textContent: `
Good news! Your order is now being prepared for shipment.

Order #{{orderNumber}}
Status: Processing
Expected shipping: {{expectedShipping}}

Track your order: {{trackingUrl}}

Best regards,
DY Official Team
      `.trim(),
      htmlContent: `
<h2>Good news! Your order is being prepared 📦</h2>
<div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Order #{{orderNumber}}</h3>
  <p><strong>Status:</strong> Processing</p>
  <p><strong>Expected shipping:</strong> {{expectedShipping}}</p>
</div>
<p><a href="{{trackingUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Track Your Order</a></p>
<p>Best regards,<br>DY Official Team</p>
      `,
      smsContent:
        "Order #{{orderNumber}} is being prepared! Expected shipping: {{expectedShipping}}. Track: {{trackingUrl}}",
      variables: ["orderNumber", "expectedShipping", "trackingUrl"],
    },

    ORDER_SHIPPED: {
      id: "ORDER_SHIPPED",
      name: "Order Shipped",
      subject: "Your order #{{orderNumber}} has shipped! 🚚",
      textContent: `
Great news! Your order has been shipped.

Order #{{orderNumber}}
Tracking Number: {{trackingNumber}}
Carrier: {{carrier}}
Expected delivery: {{deliveryDate}}

Track your package: {{carrierTrackingUrl}}

Best regards,
DY Official Team
      `.trim(),
      htmlContent: `
<h2>Great news! Your order has shipped 🚚</h2>
<div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Order #{{orderNumber}}</h3>
  <p><strong>Tracking Number:</strong> <code>{{trackingNumber}}</code></p>
  <p><strong>Carrier:</strong> {{carrier}}</p>
  <p><strong>Expected delivery:</strong> {{deliveryDate}}</p>
</div>
<p><a href="{{carrierTrackingUrl}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Track Package</a></p>
<p>Best regards,<br>DY Official Team</p>
      `,
      smsContent:
        "Order #{{orderNumber}} shipped via {{carrier}}! Tracking: {{trackingNumber}}. Expected: {{deliveryDate}}",
      variables: [
        "orderNumber",
        "trackingNumber",
        "carrier",
        "deliveryDate",
        "carrierTrackingUrl",
      ],
    },

    ORDER_DELIVERED: {
      id: "ORDER_DELIVERED",
      name: "Order Delivered",
      subject: "Your order #{{orderNumber}} has been delivered! 📦✨",
      textContent: `
Fantastic! Your order has been delivered.

Order #{{orderNumber}}
Delivered on: {{deliveryDate}}
Delivered to: {{deliveryAddress}}

We hope you love your purchase! Don't forget to leave a review.

Best regards,
DY Official Team
      `.trim(),
      htmlContent: `
<h2>Fantastic! Your order has been delivered 📦✨</h2>
<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Order #{{orderNumber}}</h3>
  <p><strong>Delivered on:</strong> {{deliveryDate}}</p>
  <p><strong>Delivered to:</strong> {{deliveryAddress}}</p>
</div>
<p>We hope you love your purchase! <a href="{{reviewUrl}}">Leave a review</a> to help other customers.</p>
<p>Best regards,<br>DY Official Team</p>
      `,
      smsContent:
        "Order #{{orderNumber}} delivered! Delivered on {{deliveryDate}}. Leave a review: {{reviewUrl}}",
      variables: [
        "orderNumber",
        "deliveryDate",
        "deliveryAddress",
        "reviewUrl",
      ],
    },

    PAYMENT_FAILED: {
      id: "PAYMENT_FAILED",
      name: "Payment Failed",
      subject: "Payment issue with order #{{orderNumber}} - Action required",
      textContent: `
We encountered an issue processing payment for your order.

Order #{{orderNumber}}
Amount: {{currency}} {{totalAmount}}
Issue: {{failureReason}}

Please update your payment method to complete your order:
{{paymentUpdateUrl}}

If you have questions, contact our support team.

Best regards,
DY Official Team
      `.trim(),
      htmlContent: `
<h2>Payment Issue - Action Required</h2>
<div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
  <h3>Order #{{orderNumber}}</h3>
  <p><strong>Amount:</strong> {{currency}} {{totalAmount}}</p>
  <p><strong>Issue:</strong> {{failureReason}}</p>
</div>
<p><a href="{{paymentUpdateUrl}}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Update Payment Method</a></p>
<p>If you have questions, <a href="{{supportUrl}}">contact our support team</a>.</p>
<p>Best regards,<br>DY Official Team</p>
      `,
      smsContent:
        "Payment failed for order #{{orderNumber}}. Update payment: {{paymentUpdateUrl}}",
      variables: [
        "orderNumber",
        "currency",
        "totalAmount",
        "failureReason",
        "paymentUpdateUrl",
        "supportUrl",
      ],
    },

    ORDER_CANCELLED: {
      id: "ORDER_CANCELLED",
      name: "Order Cancelled",
      subject: "Order #{{orderNumber}} has been cancelled",
      textContent: `
Your order has been cancelled as requested.

Order #{{orderNumber}}
Cancelled on: {{cancellationDate}}
Reason: {{cancellationReason}}

Any payments will be refunded within 3-5 business days.

Best regards,
DY Official Team
      `.trim(),
      htmlContent: `
<h2>Order Cancelled</h2>
<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Order #{{orderNumber}}</h3>
  <p><strong>Cancelled on:</strong> {{cancellationDate}}</p>
  <p><strong>Reason:</strong> {{cancellationReason}}</p>
</div>
<p>Any payments will be refunded within 3-5 business days.</p>
<p>Best regards,<br>DY Official Team</p>
      `,
      smsContent:
        "Order #{{orderNumber}} cancelled. Refund processed within 3-5 days.",
      variables: ["orderNumber", "cancellationDate", "cancellationReason"],
    },

    LOW_STOCK_ALERT: {
      id: "LOW_STOCK_ALERT",
      name: "Low Stock Alert",
      subject: "🚨 Low Stock Alert - {{productName}}",
      textContent: `
Low Stock Alert

Product: {{productName}}
SKU: {{productSku}}
Current Stock: {{currentStock}}
Threshold: {{threshold}}

Immediate restocking recommended.

DY Official System
      `.trim(),
      htmlContent: `
<h2>🚨 Low Stock Alert</h2>
<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
  <h3>{{productName}}</h3>
  <p><strong>SKU:</strong> {{productSku}}</p>
  <p><strong>Current Stock:</strong> {{currentStock}}</p>
  <p><strong>Alert Threshold:</strong> {{threshold}}</p>
</div>
<p><strong>Action Required:</strong> Immediate restocking recommended.</p>
<p>DY Official System</p>
      `,
      variables: ["productName", "productSku", "currentStock", "threshold"],
    },
  };

  /**
   * Send notification using specified template and channels
   */
  static async sendNotification(
    options: SendNotificationOptions
  ): Promise<NotificationDelivery> {
    const template = this.TEMPLATES[options.template];
    if (!template) {
      throw new Error(`Template not found: ${options.template}`);
    }

    // Create notification delivery record
    const delivery = await this.createDeliveryRecord(options, template);

    try {
      // Process variables in template content
      const processedTemplate = this.processTemplate(
        template,
        options.variables
      );

      // Send through enabled channels
      const results = await Promise.allSettled([
        options.channels.email && options.recipient.email
          ? this.sendEmailNotification(
              options.recipient.email,
              processedTemplate
            )
          : Promise.resolve(null),
        options.channels.sms && options.recipient.phone
          ? this.sendSmsNotification(
              options.recipient.phone,
              processedTemplate.smsContent || processedTemplate.textContent
            )
          : Promise.resolve(null),
        options.channels.inApp && options.recipient.userId
          ? this.sendInAppNotification(
              options.recipient.userId,
              processedTemplate,
              options.context
            )
          : Promise.resolve(null),
      ]);

      // Check if any channel succeeded
      const hasSuccess = results.some(
        (result) => result.status === "fulfilled" && result.value
      );

      if (hasSuccess) {
        await this.updateDeliveryStatus(delivery.id, "SENT");

        // Log notification event
        if (options.context.orderId) {
          await OrderEventService.createEvent({
            orderId: options.context.orderId,
            kind: "NOTIFICATION_SENT",
            message: `${template.name} notification sent`,
            metadata: {
              notificationId: delivery.id,
              template: options.template,
              channels: options.channels as Record<string, unknown>,
            },
          });
        }
      } else {
        await this.updateDeliveryStatus(
          delivery.id,
          "FAILED",
          "All channels failed"
        );
      }

      return delivery;
    } catch (error) {
      console.error("Notification send error:", error);
      await this.updateDeliveryStatus(
        delivery.id,
        "FAILED",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  }

  /**
   * Send order-specific notifications with proper context
   */
  static async sendOrderNotification(
    orderId: string,
    template: string,
    additionalVariables: Record<string, string | number> = {}
  ): Promise<NotificationDelivery | null> {
    try {
      // Get order with user details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: { email: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              product: {
                include: {
                  images: {
                    orderBy: { position: "asc" },
                  },
                },
              },
            },
          },
          shippingAddress: true,
          billingAddress: true,
        },
      });

      if (!order || !order.user?.email) {
        console.warn(
          `Cannot send notification for order ${orderId}: missing order or user email`
        );
        return null;
      }

      // Prepare base variables
      const totalFormatted = formatPriceCents(order.totalCents, {
        currency: order.currency,
      });

      const baseVariables: Record<string, string | number> = {
        orderNumber: orderId.slice(-8).toUpperCase(),
        currency: order.currency,
        totalAmount: (order.totalCents / 100).toFixed(2),
        totalFormatted,
        customerName:
          [order.user.firstName, order.user.lastName]
            .filter(Boolean)
            .join(" ") || "Customer",
        trackingUrl: `${process.env.NEXTAUTH_URL}/account/orders/${orderId}`,
      };

      for (const [key, value] of Object.entries(additionalVariables)) {
        if (typeof value === "string" || typeof value === "number") {
          baseVariables[key] = value;
        }
      }

      if (template === "ORDER_CONFIRMATION") {
        const deliveryEstimate =
          typeof additionalVariables.deliveryEstimate === "string"
            ? additionalVariables.deliveryEstimate
            : undefined;

        const lines: OrderEmailLine[] = order.items.map((item) => {
          let parsedCustomizations: unknown;
          if (item.customizations) {
            try {
              parsedCustomizations = JSON.parse(item.customizations);
            } catch {
              parsedCustomizations = undefined;
            }
          }
          return {
            name: item.nameSnapshot,
            sku: item.sku,
            size: item.size,
            qty: item.qty,
            unitPriceCents: item.unitPriceCents,
            lineTotalCents: item.lineTotalCents,
            imageUrl: item.product?.images?.[0]?.url || null,
            customizations: (parsedCustomizations ??
              null) as JerseyCustomization | null,
          };
        });

        if (!order.shippingAddress) {
          const fallback = `Order #${baseVariables.orderNumber} total ${totalFormatted}`;
          baseVariables.orderHtml = `<p>${fallback}</p>`;
          baseVariables.orderText = fallback;
        } else {
          const payload: RichOrderEmailPayload = {
            orderId: order.id,
            currency: order.currency,
            lines,
            subtotalCents: order.subtotalCents,
            discountCents: order.discountCents,
            taxCents: order.taxCents,
            shippingCents: order.shippingCents,
            totalCents: order.totalCents,
            shipping: {
              fullName: order.shippingAddress.fullName,
              line1: order.shippingAddress.line1,
              line2: order.shippingAddress.line2,
              city: order.shippingAddress.city,
              region: order.shippingAddress.region,
              postalCode: order.shippingAddress.postalCode,
              country: order.shippingAddress.country,
              phone: order.shippingAddress.phone,
            },
            billing: order.billingAddress
              ? {
                  fullName: order.billingAddress.fullName,
                  line1: order.billingAddress.line1,
                  line2: order.billingAddress.line2,
                  city: order.billingAddress.city,
                  region: order.billingAddress.region,
                  postalCode: order.billingAddress.postalCode,
                  country: order.billingAddress.country,
                  phone: order.billingAddress.phone,
                }
              : undefined,
            estimatedDelivery:
              (additionalVariables.deliveryEstimate as string | undefined) ||
              undefined,
          };

          baseVariables.orderHtml = buildRichOrderConfirmationHtml(payload);
          baseVariables.orderText = buildRichOrderConfirmationText(payload);
        }
      }

      return await this.sendNotification({
        template,
        recipient: {
          email: order.user.email,
          userId: order.userId || undefined,
        },
        channels: {
          email: true,
          inApp: !!order.userId,
        },
        variables: baseVariables,
        context: {
          orderId,
          userId: order.userId || undefined,
        },
        priority: "NORMAL",
      });
    } catch (error) {
      console.error(`Failed to send order notification for ${orderId}:`, error);
      return null;
    }
  }

  /**
   * Process template variables
   */
  private static processTemplate(
    template: NotificationTemplate,
    variables: Record<string, string | number>
  ): {
    subject: string;
    textContent: string;
    htmlContent: string;
    smsContent?: string;
  } {
    const processText = (text: string): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key]?.toString() || match;
      });
    };

    return {
      subject: processText(template.subject),
      textContent: processText(template.textContent),
      htmlContent: processText(template.htmlContent),
      smsContent: template.smsContent
        ? processText(template.smsContent)
        : undefined,
    };
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(
    email: string,
    content: { subject: string; textContent: string; htmlContent: string }
  ): Promise<boolean> {
    try {
      const mailer = getMailer();
      await mailer.send({
        to: email,
        subject: content.subject,
        text: content.textContent,
        html: content.htmlContent,
      });
      return true;
    } catch (error) {
      console.error("Email notification failed:", error);
      return false;
    }
  }

  /**
   * Send SMS notification (placeholder for future SMS integration)
   */
  private static async sendSmsNotification(
    phone: string,
    message: string
  ): Promise<boolean> {
    try {
      // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
      console.log(`SMS to ${phone}: ${message}`);
      return true;
    } catch (error) {
      console.error("SMS notification failed:", error);
      return false;
    }
  }

  /**
   * Send in-app notification
   */
  private static async sendInAppNotification(
    userId: string,
    content: { subject: string; textContent: string },
    context: NotificationContext
  ): Promise<boolean> {
    try {
      // Store in-app notification in database
      await prisma.notification.create({
        data: {
          userId,
          title: content.subject,
          message: content.textContent,
          type: "ORDER_UPDATE",
          orderId: context.orderId,
          read: false,
          createdAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      console.error("In-app notification failed:", error);
      return false;
    }
  }

  /**
   * Create notification delivery record
   */
  private static async createDeliveryRecord(
    options: SendNotificationOptions,
    template: NotificationTemplate
  ): Promise<NotificationDelivery> {
    // For now, create a simple in-memory record
    // In production, this would be stored in database
    const delivery: NotificationDelivery = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      templateId: template.id,
      channels: options.channels,
      status: "PENDING",
      retryCount: 0,
    };

    return delivery;
  }

  /**
   * Update delivery status
   */
  private static async updateDeliveryStatus(
    deliveryId: string,
    status: NotificationDelivery["status"],
    reason?: string
  ): Promise<void> {
    // TODO: Update delivery record in database
    console.log(
      `Notification ${deliveryId} status: ${status}${
        reason ? ` - ${reason}` : ""
      }`
    );
  }

  /**
   * Get available notification templates
   */
  static getTemplates(): NotificationTemplate[] {
    return Object.values(this.TEMPLATES);
  }

  /**
   * Get template by ID
   */
  static getTemplate(templateId: string): NotificationTemplate | null {
    return this.TEMPLATES[templateId] || null;
  }
}
