import { prisma } from "../prisma";
import { ShippingService, PackageDimensions } from "./ShippingService";
import { OrderEventService } from "../orderEventService";
import type {
  Order,
  OrderItem,
  Product,
  ProductVariant,
  User,
  Address,
  OrderEvent,
} from "@prisma/client";

type OrderWithRelations = Order & {
  items: (OrderItem & {
    product: Product;
    variant?: ProductVariant | null;
  })[];
  user?: User | null;
  shippingAddress?: Address | null;
  events: OrderEvent[];
  shipment?: any | null;
  shippedAt?: Date | null;
};

export interface FulfillmentItem {
  orderItemId: string;
  productId: string;
  variantId?: string;
  size?: string;
  quantity: number;
  picked: boolean;
  pickedAt?: Date;
  pickedBy?: string;
  location?: string; // Warehouse location/bin
  notes?: string;
}

export interface PickingList {
  id: string;
  orderId: string;
  warehouseZone: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  assignedTo?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  items: FulfillmentItem[];
  estimatedPickTime: number; // minutes
}

export interface PackingSlip {
  orderId: string;
  pickingListId: string;
  customerName: string;
  shippingAddress: any;
  items: Array<{
    productName: string;
    sku: string;
    size?: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  specialInstructions?: string;
  giftMessage?: string;
}

export interface WarehouseLocation {
  zone: string;
  aisle: string;
  shelf: string;
  bin: string;
}

/**
 * Fulfillment Service
 * Manages order fulfillment workflow from payment to shipping
 */
export class FulfillmentService {
  /**
   * Process order for fulfillment after payment confirmation
   */
  static async processOrderForFulfillment(
    orderId: string
  ): Promise<PickingList> {
    try {
      // Get order with items
      const order = (await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                },
              },
              variant: {
                select: {
                  id: true,
                  type: true,
                  value: true,
                },
              },
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          shippingAddress: true,
        },
      })) as OrderWithRelations | null;

      if (!order) {
        throw new Error("Order not found");
      }

      // Check if order is in correct status for fulfillment
      if (!["PAID", "PROCESSING"].includes(order.status)) {
        throw new Error(
          `Order ${orderId} is not ready for fulfillment (status: ${order.status})`
        );
      }

      // Create fulfillment items from order items
      const fulfillmentItems: FulfillmentItem[] = order.items.map((item) => ({
        orderItemId: item.id,
        productId: item.productId,
        variantId: item.variant?.id || undefined,
        size: item.size || undefined,
        quantity: item.qty,
        picked: false,
        location: this.getProductLocation(
          item.productId,
          item.size || undefined
        ),
      }));

      // Determine priority based on order characteristics
      const priority = this.calculateOrderPriority(order);

      // Determine warehouse zone based on products
      const warehouseZone = this.determineWarehouseZone(fulfillmentItems);

      // Calculate estimated pick time
      const estimatedPickTime = this.calculatePickTime(fulfillmentItems);

      // Create picking list
      const pickingList: PickingList = {
        id: `PL_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        orderId,
        warehouseZone,
        priority,
        status: "PENDING",
        createdAt: new Date(),
        items: fulfillmentItems,
        estimatedPickTime,
      };

      // Store picking list (for now, we'll store in order events)
      await OrderEventService.createEvent({
        orderId,
        kind: "FULFILLMENT_STARTED",
        message: `Picking list created for fulfillment`,
        metadata: {
          pickingListId: pickingList.id,
          warehouseZone,
          priority,
          estimatedPickTime,
          itemCount: fulfillmentItems.length,
        },
      });

      // Update order status to FULFILLING
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "FULFILLING" },
      });

      // Send notification to warehouse team (mock)
      console.log(
        `📦 NEW PICKING LIST: ${pickingList.id} for order ${orderId} (Priority: ${priority})`
      );

      return pickingList;
    } catch (error) {
      console.error(`Error processing order for fulfillment:`, error);
      throw error;
    }
  }

  /**
   * Complete picking process and prepare for packing
   */
  static async completePickingList(
    pickingListId: string,
    pickedItems: Array<{
      orderItemId: string;
      quantity: number;
      notes?: string;
    }>,
    pickedBy: string
  ): Promise<PackingSlip> {
    try {
      // For this implementation, we'll reconstruct the picking list from order data
      // In a real system, this would be stored in a separate table

      const orderId = pickingListId.split("_")[2]; // Extract from picking list ID format

      const order = (await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                  priceCents: true,
                },
              },
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          shippingAddress: true,
        },
      })) as OrderWithRelations | null;

      if (!order) {
        throw new Error("Order not found for picking list");
      }

      // Generate packing slip
      const packingSlip: PackingSlip = {
        orderId: order.id,
        pickingListId,
        customerName: `${order.user?.firstName || ""} ${
          order.user?.lastName || ""
        }`.trim(),
        shippingAddress: order.shippingAddress,
        items: order.items.map((item) => ({
          productName: item.product.name,
          sku: item.product.sku,
          size: item.size || undefined,
          quantity: item.qty,
          price: item.unitPriceCents,
        })),
        subtotal: order.subtotalCents,
        shipping: order.shippingCents,
        tax: order.taxCents,
        total: order.totalCents,
      };

      // Log picking completion
      await OrderEventService.createEvent({
        orderId,
        kind: "PICKING_COMPLETED",
        message: `Picking completed by ${pickedBy}`,
        metadata: {
          pickingListId,
          pickedBy,
          pickedItems,
          completedAt: new Date().toISOString(),
        },
      });

      return packingSlip;
    } catch (error) {
      console.error("Error completing picking list:", error);
      throw error;
    }
  }

  /**
   * Pack order and create shipping label
   */
  static async packAndShipOrder(
    orderId: string,
    packingDetails: {
      packages: PackageDimensions[];
      carrier: string;
      service: string;
      specialInstructions?: string;
    },
    packedBy: string
  ): Promise<{ trackingNumber: string; labelUrl: string }> {
    try {
      // Get order and shipping details
      const order = (await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          shippingAddress: true,
        },
      })) as OrderWithRelations | null;

      if (!order?.shippingAddress) {
        throw new Error("Order or shipping address not found");
      }

      // Convert address to shipping format
      const shippingAddress = {
        fullName: order.shippingAddress.fullName,
        line1: order.shippingAddress.line1,
        line2: order.shippingAddress.line2 || undefined,
        city: order.shippingAddress.city,
        region: order.shippingAddress.region || undefined,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country,
        phone: order.shippingAddress.phone || undefined,
      };

      // Get warehouse address (mock for now)
      const warehouseAddress = {
        fullName: "DY Official Warehouse",
        line1: "123 Fulfillment Street",
        city: "London",
        postalCode: "E1 6AN",
        country: "GB",
      };

      // Create shipping label
      const shippingLabel = await ShippingService.createShippingLabel(
        orderId,
        packingDetails.carrier,
        packingDetails.service,
        warehouseAddress,
        shippingAddress,
        packingDetails.packages
      );

      // Log packing completion
      await OrderEventService.createEvent({
        orderId,
        kind: "ORDER_PACKED",
        message: `Order packed and shipped via ${packingDetails.carrier}`,
        metadata: {
          packedBy,
          carrier: packingDetails.carrier,
          service: packingDetails.service,
          trackingNumber: shippingLabel.trackingNumber,
          packages: packingDetails.packages,
          specialInstructions: packingDetails.specialInstructions,
          packedAt: new Date().toISOString(),
        },
      });

      return {
        trackingNumber: shippingLabel.trackingNumber,
        labelUrl: shippingLabel.labelUrl,
      };
    } catch (error) {
      console.error("Error packing and shipping order:", error);
      throw error;
    }
  }

  /**
   * Get fulfillment status for an order
   */
  static async getFulfillmentStatus(orderId: string): Promise<{
    status: string;
    pickingList?: PickingList;
    packingSlip?: PackingSlip;
    shipment?: any;
    timeline: Array<{
      stage: string;
      status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
      completedAt?: Date;
      notes?: string;
    }>;
  }> {
    try {
      const order = (await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          events: {
            where: {
              kind: {
                in: [
                  "FULFILLMENT_STARTED",
                  "PICKING_COMPLETED",
                  "ORDER_PACKED",
                  "ORDER_SHIPPED",
                ],
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      })) as OrderWithRelations | null;

      if (!order) {
        throw new Error("Order not found");
      }

      // Build timeline from order events
      const timeline = [
        {
          stage: "Payment Confirmed",
          status: "COMPLETED" as const,
          completedAt: order.paidAt || undefined,
        },
        {
          stage: "Picking List Created",
          status: order.events.some((e) => e.kind === "FULFILLMENT_STARTED")
            ? ("COMPLETED" as const)
            : ("PENDING" as const),
          completedAt: order.events.find(
            (e) => e.kind === "FULFILLMENT_STARTED"
          )?.createdAt,
        },
        {
          stage: "Items Picked",
          status: order.events.some((e) => e.kind === "PICKING_COMPLETED")
            ? ("COMPLETED" as const)
            : ("PENDING" as const),
          completedAt: order.events.find((e) => e.kind === "PICKING_COMPLETED")
            ?.createdAt,
        },
        {
          stage: "Packed & Labeled",
          status: order.events.some((e) => e.kind === "ORDER_PACKED")
            ? ("COMPLETED" as const)
            : ("PENDING" as const),
          completedAt: order.events.find((e) => e.kind === "ORDER_PACKED")
            ?.createdAt,
        },
        {
          stage: "Shipped",
          status: order.events.some((e) => e.kind === "ORDER_SHIPPED")
            ? ("COMPLETED" as const)
            : ("PENDING" as const),
          completedAt: order.shippedAt || undefined,
        },
      ];

      return {
        status: order.status,
        shipment: order.shipment,
        timeline,
      };
    } catch (error) {
      console.error("Error getting fulfillment status:", error);
      throw error;
    }
  }

  /**
   * Get pending picking lists for warehouse team
   */
  static async getPendingPickingLists(): Promise<PickingList[]> {
    try {
      // Get orders that need picking
      const orders = (await prisma.order.findMany({
        where: {
          status: "FULFILLING",
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                },
              },
            },
          },
          events: {
            where: {
              kind: "FULFILLMENT_STARTED",
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      })) as OrderWithRelations[];

      // Convert to picking lists
      const pickingLists: PickingList[] = orders.map((order) => {
        const fulfillmentEvent = order.events[0];
        const metadata = fulfillmentEvent?.meta
          ? JSON.parse(fulfillmentEvent.meta)
          : {};

        const items: FulfillmentItem[] = order.items.map((item) => ({
          orderItemId: item.id,
          productId: item.productId,
          variantId: item.variant?.id || undefined,
          size: item.size || undefined,
          quantity: item.qty,
          picked: false,
          location: this.getProductLocation(
            item.productId,
            item.size || undefined
          ),
        }));

        return {
          id: metadata.pickingListId || `PL_${order.id}`,
          orderId: order.id,
          warehouseZone: metadata.warehouseZone || "A",
          priority: metadata.priority || "NORMAL",
          status: "PENDING",
          createdAt: fulfillmentEvent?.createdAt || order.createdAt,
          items,
          estimatedPickTime:
            metadata.estimatedPickTime || this.calculatePickTime(items),
        };
      });

      return pickingLists;
    } catch (error) {
      console.error("Error getting pending picking lists:", error);
      return [];
    }
  }

  /**
   * Calculate order priority based on various factors
   */
  private static calculateOrderPriority(
    order: any
  ): "LOW" | "NORMAL" | "HIGH" | "URGENT" {
    const orderValue = order.totalCents;
    const orderAge = Date.now() - new Date(order.createdAt).getTime();
    const hoursOld = orderAge / (1000 * 60 * 60);

    // High value orders
    if (orderValue >= 20000) return "HIGH"; // £200+

    // Urgent if older than 24 hours
    if (hoursOld >= 24) return "URGENT";

    // High priority if older than 12 hours
    if (hoursOld >= 12) return "HIGH";

    // Medium value orders
    if (orderValue >= 10000) return "HIGH"; // £100+

    return "NORMAL";
  }

  /**
   * Determine warehouse zone based on products
   */
  private static determineWarehouseZone(items: FulfillmentItem[]): string {
    // Simple zone assignment - in reality this would be based on product categories
    const zones = ["A", "B", "C"];
    return zones[Math.floor(Math.random() * zones.length)];
  }

  /**
   * Calculate estimated pick time for items
   */
  private static calculatePickTime(items: FulfillmentItem[]): number {
    // Base time of 5 minutes plus 2 minutes per item
    return 5 + items.length * 2;
  }

  /**
   * Get mock product location
   */
  private static getProductLocation(productId: string, size?: string): string {
    const zones = ["A1-01", "A1-02", "B2-05", "B2-06", "C3-12"];
    return zones[Math.floor(Math.random() * zones.length)];
  }
}
