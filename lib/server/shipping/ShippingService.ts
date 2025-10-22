import { prisma } from "../prisma";
import { OrderNotificationHandler } from "../notifications/OrderNotificationHandler";

export interface ShippingAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface PackageDimensions {
  length: number; // cm
  width: number; // cm
  height: number; // cm
  weight: number; // grams
}

export interface ShippingRate {
  carrier: string;
  service: string;
  cost: number; // cents
  currency: string;
  estimatedDays: number;
  trackingIncluded: boolean;
}

export interface ShipmentLabel {
  trackingNumber: string;
  labelUrl: string;
  carrier: string;
  service: string;
  cost: number;
  currency: string;
  estimatedDelivery: Date;
}

export interface TrackingUpdate {
  status:
    | "LABEL_CREATED"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "EXCEPTION";
  location?: string;
  timestamp: Date;
  description: string;
}

export interface CarrierConfig {
  name: string;
  apiKey: string;
  accountNumber?: string;
  testMode: boolean;
  supportedServices: string[];
  baseUrl: string;
}

/**
 * Core Shipping Service
 * Handles shipping rate calculation, label generation, and tracking
 */
export class ShippingService {
  // Supported carriers with their configurations
  private static readonly CARRIERS: Record<string, CarrierConfig> = {
    "Royal Mail": {
      name: "Royal Mail",
      apiKey: process.env.ROYAL_MAIL_API_KEY || "test_key",
      testMode: !process.env.ROYAL_MAIL_API_KEY,
      supportedServices: [
        "1st Class",
        "2nd Class",
        "Special Delivery",
        "Tracked 24",
        "Tracked 48",
      ],
      baseUrl: "https://api.royalmail.net/shipping/v2",
    },
    DPD: {
      name: "DPD",
      apiKey: process.env.DPD_API_KEY || "test_key",
      testMode: !process.env.DPD_API_KEY,
      supportedServices: ["Next Day", "Express", "Classic"],
      baseUrl: "https://api.dpd.co.uk/v1",
    },
    FedEx: {
      name: "FedEx",
      apiKey: process.env.FEDEX_API_KEY || "test_key",
      accountNumber: process.env.FEDEX_ACCOUNT_NUMBER,
      testMode: !process.env.FEDEX_API_KEY,
      supportedServices: [
        "International Priority",
        "International Economy",
        "Express",
      ],
      baseUrl: "https://apis.fedex.com",
    },
    UPS: {
      name: "UPS",
      apiKey: process.env.UPS_API_KEY || "test_key",
      accountNumber: process.env.UPS_ACCOUNT_NUMBER,
      testMode: !process.env.UPS_API_KEY,
      supportedServices: ["Standard", "Express", "Express Plus"],
      baseUrl: "https://onlinetools.ups.com/api",
    },
    DHL: {
      name: "DHL",
      apiKey: process.env.DHL_API_KEY || "test_key",
      accountNumber: process.env.DHL_ACCOUNT_NUMBER,
      testMode: !process.env.DHL_API_KEY,
      supportedServices: ["Express Worldwide", "Economy Select", "Express"],
      baseUrl: "https://api-eu.dhl.com",
    },
  };

  /**
   * Calculate shipping rates for an order
   */
  static async calculateShippingRates(
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    packages: PackageDimensions[],
    orderValue: number // cents
  ): Promise<ShippingRate[]> {
    const rates: ShippingRate[] = [];

    try {
      // For each carrier, calculate rates
      for (const [carrierName, config] of Object.entries(this.CARRIERS)) {
        if (config.testMode) {
          // Use mock rates for development
          const mockRates = this.getMockRates(
            carrierName,
            toAddress.country,
            orderValue
          );
          rates.push(...mockRates);
        } else {
          // Use real carrier APIs
          const carrierRates = await this.getCarrierRates(
            carrierName,
            fromAddress,
            toAddress
          );
          rates.push(...carrierRates);
        }
      }

      // Sort by cost (cheapest first)
      rates.sort((a, b) => a.cost - b.cost);

      return rates;
    } catch (error) {
      console.error("Error calculating shipping rates:", error);
      // Fallback to basic rates if API fails
      return this.getFallbackRates(toAddress.country, orderValue);
    }
  }

  /**
   * Create shipping label and schedule pickup
   */
  static async createShippingLabel(
    orderId: string,
    carrierName: string,
    serviceType: string
  ): Promise<ShipmentLabel> {
    try {
      const config = this.CARRIERS[carrierName];

      if (!config) {
        throw new Error(`Unsupported carrier: ${carrierName}`);
      }

      let label: ShipmentLabel;

      if (config.testMode) {
        // Generate mock label for development
        label = this.generateMockLabel(carrierName, serviceType);
      } else {
        // Use real carrier API
        label = await this.createCarrierLabel(config, serviceType);
      }

      // Store shipment record in database
      await this.createShipmentRecord(orderId, label);

      // Update order status to SHIPPED
      await this.updateOrderShippingStatus(
        orderId,
        label.trackingNumber,
        carrierName
      );

      // Send shipping notification to customer
      await OrderNotificationHandler.notifyOrderStatusChange(
        orderId,
        "SHIPPED",
        {
          trackingNumber: label.trackingNumber,
          carrier: carrierName,
          estimatedDelivery: label.estimatedDelivery,
        }
      );

      return label;
    } catch (error) {
      console.error(
        `Error creating shipping label for order ${orderId}:`,
        error
      );
      throw new Error(
        `Failed to create shipping label: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Track shipment status
   */
  static async trackShipment(
    trackingNumber: string,
    carrier: string
  ): Promise<TrackingUpdate[]> {
    try {
      const config = this.CARRIERS[carrier];

      if (!config) {
        throw new Error(`Unsupported carrier: ${carrier}`);
      }

      if (config.testMode) {
        // Return mock tracking data
        return this.getMockTrackingUpdates();
      }

      // Use real carrier tracking API
      return await this.getCarrierTracking();
    } catch (error) {
      console.error(`Error tracking shipment ${trackingNumber}:`, error);
      return [];
    }
  }

  /**
   * Update all shipments with latest tracking information
   */
  static async updateAllShipmentTracking(): Promise<void> {
    try {
      // Get all active shipments
      const activeShipments = await prisma.shipment.findMany({
        where: {
          status: {
            notIn: ["DELIVERED", "CANCELLED", "RETURNED"],
          },
        },
        include: {
          order: true,
        },
      });

      for (const shipment of activeShipments) {
        try {
          const updates = await this.trackShipment(
            shipment.trackingNumber,
            shipment.carrier
          );

          if (updates.length > 0) {
            const latestUpdate = updates[updates.length - 1];

            // Update shipment status if changed
            if (latestUpdate.status !== shipment.status) {
              await prisma.shipment.update({
                where: { id: shipment.id },
                data: {
                  status: latestUpdate.status,
                  lastTrackedAt: new Date(),
                  trackingUpdates: updates as any, // Store as JSON
                },
              });

              // Notify customer of delivery
              if (latestUpdate.status === "DELIVERED") {
                await OrderNotificationHandler.notifyOrderStatusChange(
                  shipment.orderId,
                  "DELIVERED"
                );
              }
            }
          }
        } catch (error) {
          console.error(
            `Error updating tracking for shipment ${shipment.id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error updating shipment tracking:", error);
    }
  }

  /**
   * Get mock shipping rates for development
   */
  private static getMockRates(
    carrier: string,
    country: string,
    orderValue: number
  ): ShippingRate[] {
    const isInternational = country !== "GB";
    const freeShippingThreshold = 5000; // £50

    const baseRates = {
      "Royal Mail": [
        { service: "2nd Class", cost: 395, days: 3 },
        { service: "1st Class", cost: 495, days: 1 },
        { service: "Tracked 48", cost: 595, days: 2 },
        { service: "Special Delivery", cost: 795, days: 1 },
      ],
      DPD: [
        { service: "Classic", cost: 695, days: 2 },
        { service: "Express", cost: 895, days: 1 },
        { service: "Next Day", cost: 1295, days: 1 },
      ],
      FedEx: [
        { service: "International Economy", cost: 1895, days: 5 },
        { service: "International Priority", cost: 2995, days: 3 },
        { service: "Express", cost: 4995, days: 1 },
      ],
      UPS: [
        { service: "Standard", cost: 1695, days: 4 },
        { service: "Express", cost: 2795, days: 2 },
        { service: "Express Plus", cost: 3995, days: 1 },
      ],
      DHL: [
        { service: "Economy Select", cost: 1995, days: 6 },
        { service: "Express Worldwide", cost: 3795, days: 2 },
        { service: "Express", cost: 4895, days: 1 },
      ],
    };

    const rates = baseRates[carrier as keyof typeof baseRates] || [];

    return rates.map((rate) => ({
      carrier,
      service: rate.service,
      cost:
        orderValue >= freeShippingThreshold && !isInternational ? 0 : rate.cost,
      currency: "GBP",
      estimatedDays: rate.days,
      trackingIncluded: true,
    }));
  }

  /**
   * Generate mock shipping label for development
   */
  private static generateMockLabel(
    carrier: string,
    service: string
  ): ShipmentLabel {
    const trackingNumber = `${carrier
      .substring(0, 3)
      .toUpperCase()}${Date.now()}${Math.random()
      .toString(36)
      .substring(2, 5)
      .toUpperCase()}`;
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(
      estimatedDelivery.getDate() + Math.floor(Math.random() * 5) + 1
    );

    return {
      trackingNumber,
      labelUrl: `https://example.com/labels/${trackingNumber}.pdf`,
      carrier,
      service,
      cost: Math.floor(Math.random() * 2000) + 500, // £5-£25
      currency: "GBP",
      estimatedDelivery,
    };
  }

  /**
   * Get mock tracking updates for development
   */
  private static getMockTrackingUpdates(): TrackingUpdate[] {
    const now = new Date();
    const updates: TrackingUpdate[] = [
      {
        status: "LABEL_CREATED",
        location: "Warehouse",
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        description: "Shipping label created",
      },
      {
        status: "PICKED_UP",
        location: "Distribution Center",
        timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        description: "Package picked up by carrier",
      },
      {
        status: "IN_TRANSIT",
        location: "Regional Hub",
        timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        description: "Package in transit to destination",
      },
    ];

    // Randomly add delivery status for some packages
    if (Math.random() > 0.7) {
      updates.push({
        status: "DELIVERED",
        location: "Customer Address",
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        description: "Package delivered successfully",
      });
    } else if (Math.random() > 0.8) {
      updates.push({
        status: "OUT_FOR_DELIVERY",
        location: "Local Delivery Hub",
        timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        description: "Package out for delivery",
      });
    }

    return updates;
  }

  /**
   * Fallback rates if all carriers fail
   */
  private static getFallbackRates(
    country: string,
    orderValue: number
  ): ShippingRate[] {
    const isInternational = country !== "GB";
    const freeShippingThreshold = 5000;

    if (orderValue >= freeShippingThreshold && !isInternational) {
      return [
        {
          carrier: "Standard",
          service: "Free Shipping",
          cost: 0,
          currency: "GBP",
          estimatedDays: 3,
          trackingIncluded: true,
        },
      ];
    }

    return [
      {
        carrier: "Standard",
        service: isInternational ? "International Standard" : "UK Standard",
        cost: isInternational ? 1995 : 695,
        currency: "GBP",
        estimatedDays: isInternational ? 7 : 3,
        trackingIncluded: true,
      },
    ];
  }

  /**
   * Store shipment record in database
   */
  private static async createShipmentRecord(
    orderId: string,
    label: ShipmentLabel
  ): Promise<void> {
    await prisma.shipment.create({
      data: {
        orderId,
        trackingNumber: label.trackingNumber,
        carrier: label.carrier,
        service: label.service,
        cost: label.cost,
        currency: label.currency,
        labelUrl: label.labelUrl,
        estimatedDelivery: label.estimatedDelivery,
        status: "LABEL_CREATED",
        createdAt: new Date(),
      },
    });
  }

  /**
   * Update order shipping status
   */
  private static async updateOrderShippingStatus(
    orderId: string,
    trackingNumber: string,
    carrier: string
  ): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
        shippedAt: new Date(),
      },
    });

    // Create order event
    await prisma.orderEvent.create({
      data: {
        orderId,
        kind: "ORDER_SHIPPED",
        message: `Order shipped via ${carrier}`,
        meta: JSON.stringify({
          trackingNumber,
          carrier,
          timestamp: new Date().toISOString(),
        }),
      },
    });
  }

  // Placeholder methods for real carrier API integration
  private static async getCarrierRates(
    carrier: string,
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress
  ): Promise<ShippingRate[]> {
    // TODO: Implement real carrier API calls
    return this.getMockRates(carrier, toAddress.country, 2000);
  }

  private static async createCarrierLabel(
    config: CarrierConfig,
    service: string
  ): Promise<ShipmentLabel> {
    // TODO: Implement real carrier API calls
    return this.generateMockLabel(config.name, service);
  }

  private static async getCarrierTracking(): Promise<TrackingUpdate[]> {
    // TODO: Implement real carrier API calls
    return this.getMockTrackingUpdates();
  }
}
