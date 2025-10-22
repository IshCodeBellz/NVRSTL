import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { TrackingService } from "@/lib/server/shipping/TrackingService";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingNumber = searchParams.get("tracking");
    const orderId = searchParams.get("order");
    const email = searchParams.get("email");

    // Require either tracking number or order ID + email
    if (!trackingNumber && (!orderId || !email)) {
      return NextResponse.json(
        { error: "Tracking number or order ID with email is required" },
        { status: 400 }
      );
    }

    let order;

    if (trackingNumber) {
      // Find order by tracking number
      const shipment = await prisma.shipment.findUnique({
        where: { trackingNumber },
        include: {
          order: {
            select: {
              id: true,
              email: true,
              status: true,
              totalCents: true,
              createdAt: true,
              paidAt: true,
              shippedAt: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
              shippingAddress: {
                select: {
                  fullName: true,
                  line1: true,
                  line2: true,
                  city: true,
                  region: true,
                  postalCode: true,
                  country: true,
                },
              },
            },
          },
        },
      });

      if (!shipment) {
        return NextResponse.json(
          { error: "Tracking number not found" },
          { status: 404 }
        );
      }

      order = shipment.order;
    } else {
      // Find order by ID and email
      order = await prisma.order.findFirst({
        where: {
          id: orderId!,
          email: email!,
        },
        select: {
          id: true,
          email: true,
          status: true,
          totalCents: true,
          createdAt: true,
          paidAt: true,
          shippedAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          shippingAddress: {
            select: {
              fullName: true,
              line1: true,
              line2: true,
              city: true,
              region: true,
              postalCode: true,
              country: true,
            },
          },
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: "Order not found or email does not match" },
          { status: 404 }
        );
      }
    }

    // Get tracking status
    const trackingStatus = await TrackingService.getTrackingStatus(order.id);

    // Determine delivery progress
    const getDeliveryProgress = (status: string) => {
      const statusMap: Record<
        string,
        { step: number; label: string; completed: boolean }
      > = {
        PENDING: { step: 1, label: "Order Confirmed", completed: true },
        PAID: { step: 1, label: "Order Confirmed", completed: true },
        PROCESSING: { step: 2, label: "Processing", completed: true },
        FULFILLING: { step: 2, label: "Processing", completed: true },
        LABEL_CREATED: {
          step: 3,
          label: "Shipping Label Created",
          completed: true,
        },
        COLLECTED: { step: 4, label: "Package Collected", completed: true },
        IN_TRANSIT: { step: 5, label: "In Transit", completed: true },
        OUT_FOR_DELIVERY: {
          step: 6,
          label: "Out for Delivery",
          completed: true,
        },
        DELIVERED: { step: 7, label: "Delivered", completed: true },
      };
      return (
        statusMap[status] || { step: 1, label: "Processing", completed: false }
      );
    };

    const progress = trackingStatus
      ? getDeliveryProgress(trackingStatus.currentStatus)
      : getDeliveryProgress(order.status);

    // Calculate delivery steps
    const deliverySteps = [
      { step: 1, label: "Order Confirmed", completed: !!order.paidAt },
      {
        step: 2,
        label: "Processing",
        completed: [
          "PROCESSING",
          "FULFILLING",
          "LABEL_CREATED",
          "COLLECTED",
          "IN_TRANSIT",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
        ].includes(order.status),
      },
      {
        step: 3,
        label: "Shipped",
        completed:
          !!order.shippedAt ||
          (trackingStatus &&
            [
              "COLLECTED",
              "IN_TRANSIT",
              "OUT_FOR_DELIVERY",
              "DELIVERED",
            ].includes(trackingStatus.currentStatus)),
      },
      {
        step: 4,
        label: "In Transit",
        completed:
          trackingStatus &&
          ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
            trackingStatus.currentStatus
          ),
      },
      {
        step: 5,
        label: "Out for Delivery",
        completed:
          trackingStatus &&
          ["OUT_FOR_DELIVERY", "DELIVERED"].includes(
            trackingStatus.currentStatus
          ),
      },
      {
        step: 6,
        label: "Delivered",
        completed: trackingStatus?.currentStatus === "DELIVERED",
      },
    ];

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        total: order.totalCents / 100,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        shippedAt: order.shippedAt,
        customer: {
          name:
            `${order.user?.firstName || ""} ${
              order.user?.lastName || ""
            }`.trim() ||
            order.shippingAddress?.fullName ||
            "Customer",
        },
        shippingAddress: order.shippingAddress,
      },
      tracking: trackingStatus
        ? {
            trackingNumber: trackingStatus.trackingNumber,
            carrier: trackingStatus.carrier,
            service: trackingStatus.service,
            currentStatus: trackingStatus.currentStatus,
            estimatedDelivery: trackingStatus.estimatedDelivery,
            actualDelivery: trackingStatus.actualDelivery,
            lastUpdated: trackingStatus.lastUpdated,
            trackingHistory: trackingStatus.trackingHistory.map((update) => ({
              timestamp: update.timestamp,
              status: update.status,
              location: update.location,
              description: update.description,
            })),
          }
        : null,
      deliveryProgress: {
        currentStep: progress.step,
        currentLabel: progress.label,
        steps: deliverySteps,
        isCompleted: trackingStatus?.currentStatus === "DELIVERED",
        estimatedDelivery: trackingStatus?.estimatedDelivery,
        actualDelivery: trackingStatus?.actualDelivery,
      },
    });
  } catch (error) {
    logger.error("Error fetching tracking information:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking information" },
      { status: 500 }
    );
  }
}
