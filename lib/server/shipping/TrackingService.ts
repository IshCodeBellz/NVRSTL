/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../prisma";
import { OrderEventService } from "../orderEventService";
import { OrderNotificationHandler } from "../notifications/OrderNotificationHandler";
import { broadcastUpdate } from "../realtime";

export interface TrackingUpdate {
  timestamp: Date;
  status: string;
  location?: string;
  description: string;
  estimatedDelivery?: Date;
}

export interface DeliveryConfirmation {
  orderId: string;
  trackingNumber: string;
  deliveredAt: Date;
  signedBy?: string;
  deliveryLocation?: string;
  proofOfDelivery?: string; // URL to photo/signature
  deliveryNotes?: string;
}

export interface TrackingStatus {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  service: string;
  currentStatus: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  trackingHistory: TrackingUpdate[];
  lastUpdated: Date;
}

/**
 * Tracking Service
 * Manages package tracking, delivery notifications, and real-time updates
 */
export class TrackingService {
  /**
   * Get tracking status for an order
   */
  static async getTrackingStatus(
    orderId: string
  ): Promise<TrackingStatus | null> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          shippedAt: true,
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // Get shipment data (using any type since Shipment model may not be in generated types yet)
      const shipment = await (prisma as any).shipment.findUnique({
        where: { orderId },
      });

      if (!shipment) {
        return null; // No shipment created yet
      }

      // Parse tracking updates from JSON
      const trackingHistory: TrackingUpdate[] = shipment.trackingUpdates
        ? JSON.parse(shipment.trackingUpdates)
        : [];

      return {
        orderId,
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
        service: shipment.service,
        currentStatus: shipment.status,
        estimatedDelivery: shipment.estimatedDelivery,
        actualDelivery: shipment.actualDelivery,
        trackingHistory,
        lastUpdated: shipment.lastTrackedAt || shipment.updatedAt,
      };
    } catch (error) {
      console.error("Error getting tracking status:", error);
      return null;
    }
  }

  /**
   * Update tracking information from carrier webhook or polling
   */
  static async updateTrackingInfo(
    trackingNumber: string,
    update: TrackingUpdate
  ): Promise<void> {
    try {
      // Find shipment by tracking number
      const shipment = await (prisma as any).shipment.findUnique({
        where: { trackingNumber },
        include: {
          order: {
            select: {
              id: true,
              userId: true,
              email: true,
            },
          },
        },
      });

      if (!shipment) {
        console.warn(
          `Shipment not found for tracking number: ${trackingNumber}`
        );
        return;
      }

      // Get current tracking history
      const currentHistory: TrackingUpdate[] = shipment.trackingUpdates
        ? JSON.parse(shipment.trackingUpdates)
        : [];

      // Add new update to history
      const updatedHistory = [
        ...currentHistory,
        {
          ...update,
          timestamp: new Date(update.timestamp),
        },
      ];

      // Determine if status changed
      const statusChanged = shipment.status !== update.status;

      // Update shipment with new tracking info
      await (prisma as any).shipment.update({
        where: { trackingNumber },
        data: {
          status: update.status,
          trackingUpdates: JSON.stringify(updatedHistory),
          lastTrackedAt: new Date(),
          estimatedDelivery:
            update.estimatedDelivery || shipment.estimatedDelivery,
          ...(update.status === "DELIVERED" && {
            actualDelivery: update.timestamp,
          }),
        },
      });

      // Log tracking event
      await OrderEventService.createEvent({
        orderId: shipment.order.id,
        kind: "TRACKING_UPDATE",
        message: `Package ${update.status.toLowerCase()}: ${
          update.description
        }`,
        metadata: {
          trackingNumber,
          carrier: shipment.carrier,
          toStatus: update.status,
          location: update.location,
          estimatedDelivery: update.estimatedDelivery?.toISOString(),
        },
      });

      // Send notifications for significant status changes
      if (statusChanged) {
        await this.handleStatusChangeNotification(
          shipment.order.id,
          update.status,
          update
        );
      }

      // Broadcast real-time update
      broadcastUpdate({
        type: "order_update",
        orderId: shipment.order.id,
        payload: {
          trackingNumber,
          status: update.status,
          update,
        },
      });

      // Handle delivery confirmation
      if (update.status === "DELIVERED") {
        await this.handleDeliveryConfirmation(
          shipment.order.id,
          trackingNumber,
          update
        );
      }
    } catch (error) {
      console.error("Error updating tracking info:", error);
      throw error;
    }
  }

  /**
   * Poll carriers for tracking updates
   */
  static async pollCarrierUpdates(): Promise<void> {
    try {
      console.log("🚚 Polling carriers for tracking updates...");

      // Get all active shipments that need tracking updates
      const activeShipments = await (prisma as any).shipment.findMany({
        where: {
          status: {
            notIn: ["DELIVERED", "CANCELLED", "RETURNED"],
          },
          // Only check shipments that haven't been updated recently
          OR: [
            { lastTrackedAt: null },
            {
              lastTrackedAt: {
                lt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
              },
            },
          ],
        },
        include: {
          order: {
            select: { id: true },
          },
        },
        take: 50, // Limit to avoid rate limits
      });

      console.log(`📦 Found ${activeShipments.length} shipments to update`);

      // Update each shipment
      for (const shipment of activeShipments) {
        try {
          await this.pollSingleShipment(
            shipment.trackingNumber,
            shipment.carrier
          );

          // Add small delay to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(
            `Error updating shipment ${shipment.trackingNumber}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error during carrier polling:", error);
    }
  }

  /**
   * Poll single shipment from carrier API
   */
  private static async pollSingleShipment(
    trackingNumber: string,
    carrier: string
  ): Promise<void> {
    try {
      // Mock tracking data for development
      const mockUpdate = this.generateMockTrackingUpdate(
        trackingNumber,
        carrier
      );

      if (mockUpdate) {
        await this.updateTrackingInfo(trackingNumber, mockUpdate);
      }

      // Real implementation would call carrier APIs:
      // switch (carrier.toLowerCase()) {
      //   case 'royal-mail':
      //     return await this.pollRoyalMail(trackingNumber);
      //   case 'dpd':
      //     return await this.pollDPD(trackingNumber);
      //   case 'fedex':
      //     return await this.pollFedEx(trackingNumber);
      //   case 'ups':
      //     return await this.pollUPS(trackingNumber);
      //   case 'dhl':
      //     return await this.pollDHL(trackingNumber);
      //   default:
      //     console.warn(`Unknown carrier: ${carrier}`);
      // }
    } catch (error) {
      console.error(`Error polling ${carrier} for ${trackingNumber}:`, error);
      throw error;
    }
  }

  /**
   * Generate mock tracking update for development
   */
  private static generateMockTrackingUpdate(
    trackingNumber: string,
    carrier: string
  ): TrackingUpdate | null {
    const statuses = [
      "LABEL_CREATED",
      "COLLECTED",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ];

    // Simulate progression through delivery stages
    const hash = trackingNumber.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    const progression = Math.abs(hash) % 100;

    if (progression < 20) {
      return {
        timestamp: new Date(),
        status: "COLLECTED",
        location: "Warehouse - London",
        description: "Package collected from sender",
      };
    } else if (progression < 50) {
      return {
        timestamp: new Date(),
        status: "IN_TRANSIT",
        location: "Distribution Center - Birmingham",
        description: "Package in transit to destination",
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // +2 days
      };
    } else if (progression < 80) {
      return {
        timestamp: new Date(),
        status: "OUT_FOR_DELIVERY",
        location: "Local Depot",
        description: "Out for delivery",
        estimatedDelivery: new Date(Date.now() + 4 * 60 * 60 * 1000), // +4 hours
      };
    } else if (progression < 95) {
      return {
        timestamp: new Date(),
        status: "DELIVERED",
        location: "Customer Address",
        description: "Delivered successfully",
      };
    }

    return null; // No update needed
  }

  /**
   * Handle status change notifications
   */
  private static async handleStatusChangeNotification(
    orderId: string,
    newStatus: string,
    update: TrackingUpdate
  ): Promise<void> {
    try {
      const notificationTemplates: Record<string, string> = {
        COLLECTED: "shipping_collected",
        IN_TRANSIT: "shipping_in_transit",
        OUT_FOR_DELIVERY: "shipping_out_for_delivery",
        DELIVERED: "shipping_delivered",
        DELIVERY_ATTEMPTED: "shipping_delivery_attempted",
        EXCEPTION: "shipping_exception",
      };

      const template = notificationTemplates[newStatus];
      if (!template) {
        return; // No notification for this status
      }

      await OrderNotificationHandler.notifyOrderStatusChange(
        orderId,
        newStatus as any,
        {
          estimatedDelivery: update.estimatedDelivery,
        }
      );
    } catch (error) {
      console.error("Error sending tracking notification:", error);
    }
  }

  /**
   * Handle delivery confirmation
   */
  private static async handleDeliveryConfirmation(
    orderId: string,
    trackingNumber: string,
    deliveryUpdate: TrackingUpdate
  ): Promise<void> {
    try {
      // Update order status to delivered
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "DELIVERED",
        },
      });

      // Log delivery event
      await OrderEventService.createEvent({
        orderId,
        kind: "ORDER_DELIVERED",
        message: `Order delivered successfully`,
        metadata: {
          trackingNumber,
          deliveredAt: deliveryUpdate.timestamp.toISOString(),
          deliveryLocation: deliveryUpdate.location,
          deliveryDescription: deliveryUpdate.description,
        },
      });

      // Send delivery confirmation notification
      await OrderNotificationHandler.notifyOrderStatusChange(
        orderId,
        "DELIVERED" as any
      );

      console.log(`✅ Order ${orderId} delivered successfully`);
    } catch (error) {
      console.error("Error handling delivery confirmation:", error);
    }
  }

  /**
   * Get delivery performance metrics
   */
  static async getDeliveryMetrics(dateRange?: { from: Date; to: Date }) {
    try {
      const whereClause = dateRange
        ? {
            createdAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          }
        : {};

      const shipments = await (prisma as any).shipment.findMany({
        where: whereClause,
        select: {
          id: true,
          carrier: true,
          service: true,
          status: true,
          estimatedDelivery: true,
          actualDelivery: true,
          createdAt: true,
        },
      });

      const totalShipments = shipments.length;
      const deliveredShipments = shipments.filter(
        (s: any) => s.status === "DELIVERED"
      );
      const deliveryRate =
        totalShipments > 0
          ? (deliveredShipments.length / totalShipments) * 100
          : 0;

      // Calculate average delivery time for delivered packages
      const deliveryTimes = deliveredShipments
        .filter((s: any) => s.actualDelivery && s.createdAt)
        .map(
          (s: any) =>
            new Date(s.actualDelivery).getTime() -
            new Date(s.createdAt).getTime()
        );

      const avgDeliveryTime =
        deliveryTimes.length > 0
          ? deliveryTimes.reduce((sum: number, time: number) => sum + time, 0) /
            deliveryTimes.length
          : 0;

      // On-time delivery rate
      const onTimeDeliveries = deliveredShipments.filter(
        (s: any) =>
          s.actualDelivery &&
          s.estimatedDelivery &&
          new Date(s.actualDelivery) <= new Date(s.estimatedDelivery)
      );
      const onTimeRate =
        deliveredShipments.length > 0
          ? (onTimeDeliveries.length / deliveredShipments.length) * 100
          : 0;

      // Carrier performance
      const carrierStats = shipments.reduce((acc: any, shipment: any) => {
        if (!acc[shipment.carrier]) {
          acc[shipment.carrier] = { total: 0, delivered: 0 };
        }
        acc[shipment.carrier].total++;
        if (shipment.status === "DELIVERED") {
          acc[shipment.carrier].delivered++;
        }
        return acc;
      }, {} as Record<string, { total: number; delivered: number }>);

      return {
        totalShipments,
        deliveredShipments: deliveredShipments.length,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        avgDeliveryTimeHours:
          Math.round((avgDeliveryTime / (1000 * 60 * 60)) * 100) / 100,
        onTimeDeliveryRate: Math.round(onTimeRate * 100) / 100,
        carrierPerformance: Object.entries(carrierStats).map(
          ([carrier, stats]: [string, any]) => ({
            carrier,
            totalShipments: stats.total,
            deliveredShipments: stats.delivered,
            deliveryRate:
              stats.total > 0
                ? Math.round((stats.delivered / stats.total) * 10000) / 100
                : 0,
          })
        ),
      };
    } catch (error) {
      console.error("Error calculating delivery metrics:", error);
      return null;
    }
  }

  /**
   * Create delivery confirmation record
   */
  static async confirmDelivery(
    confirmation: DeliveryConfirmation
  ): Promise<void> {
    try {
      // Update shipment with delivery confirmation
      await (prisma as any).shipment.update({
        where: {
          order: { id: confirmation.orderId },
        },
        data: {
          status: "DELIVERED",
          actualDelivery: confirmation.deliveredAt,
        },
      });

      // Create delivery confirmation event
      await OrderEventService.createEvent({
        orderId: confirmation.orderId,
        kind: "DELIVERY_CONFIRMED",
        message: `Delivery confirmed${
          confirmation.signedBy ? ` - signed by ${confirmation.signedBy}` : ""
        }`,
        metadata: {
          trackingNumber: confirmation.trackingNumber,
          deliveredAt: confirmation.deliveredAt.toISOString(),
          signedBy: confirmation.signedBy,
          deliveryLocation: confirmation.deliveryLocation,
          proofOfDelivery: confirmation.proofOfDelivery,
          deliveryNotes: confirmation.deliveryNotes,
        },
      });

      console.log(`📋 Delivery confirmed for order ${confirmation.orderId}`);
    } catch (error) {
      console.error("Error confirming delivery:", error);
      throw error;
    }
  }
}
