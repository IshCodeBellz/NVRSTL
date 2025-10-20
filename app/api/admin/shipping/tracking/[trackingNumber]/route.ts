/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { TrackingService } from "@/lib/server/shipping/TrackingService";
import { prisma } from "@/lib/server/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  try {
    const { trackingNumber } = params;

    if (!trackingNumber) {
      return NextResponse.json(
        { error: "Tracking number is required" },
        { status: 400 }
      );
    }

    // Find order by tracking number first
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
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    // Get full tracking status
    const trackingStatus = await TrackingService.getTrackingStatus(
      shipment.order.id
    );

    return NextResponse.json({
      shipment: {
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
        service: shipment.service,
        status: shipment.status,
        cost: shipment.cost,
        estimatedDelivery: shipment.estimatedDelivery,
        actualDelivery: shipment.actualDelivery,
        createdAt: shipment.createdAt,
        lastTrackedAt: shipment.lastTrackedAt,
      },
      order: {
        id: shipment.order.id,
        email: shipment.order.email,
        status: shipment.order.status,
        total: shipment.order.totalCents / 100,
        createdAt: shipment.order.createdAt,
        paidAt: shipment.order.paidAt,
        shippedAt: shipment.order.shippedAt,
        customer: {
          name:
            `${shipment.order.user?.firstName || ""} ${
              shipment.order.user?.lastName || ""
            }`.trim() || "Guest",
          email: shipment.order.email,
        },
        shippingAddress: shipment.order.shippingAddress,
        items: shipment.order.items.map((item) => ({
          id: item.id,
          productName: item.nameSnapshot || item.product?.name,
          sku: item.sku,
          size: (item as any).size,
          quantity: (item as any).qty,
          price: (item as any).unitPriceCents / 100,
        })),
      },
      tracking: trackingStatus
        ? {
            currentStatus: trackingStatus.currentStatus,
            estimatedDelivery: trackingStatus.estimatedDelivery,
            actualDelivery: trackingStatus.actualDelivery,
            trackingHistory: trackingStatus.trackingHistory,
            lastUpdated: trackingStatus.lastUpdated,
          }
        : null,
    });
  } catch (error) {
    logger.error("Error fetching tracking details:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking details" },
      { status: 500 }
    );
  }
}
