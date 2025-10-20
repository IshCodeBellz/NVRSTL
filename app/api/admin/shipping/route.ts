import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { TrackingService } from "@/lib/server/shipping/TrackingService";
import { ShippingService } from "@/lib/server/shipping/ShippingService";
import { prisma } from "@/lib/server/prisma";
import type { Prisma } from "@prisma/client";

interface ShipmentRecord {
  id: string;
  orderId: string;
  trackingNumber: string;
  carrier: string;
  service: string;
  status: string;
  cost: number;
  estimatedDelivery?: Date | null;
  actualDelivery?: Date | null;
  createdAt: Date;
  lastTrackedAt?: Date | null;
  order?: {
    id: string;
    email: string;
    status: string;
    total: number;
    customerName: string;
    createdAt: Date;
  };
}

type ShipmentRow = {
  id: string;
  orderId: string;
  trackingNumber: string;
  carrier: string;
  service: string;
  status: string;
  cost: number;
  estimatedDelivery: Date | null;
  actualDelivery: Date | null;
  createdAt: Date;
  lastTrackedAt: Date | null;
  order: {
    id: string;
    email: string | null;
    status: string;
    totalCents: number;
    createdAt: Date;
    user: { firstName: string | null; lastName: string | null } | null;
  };
};

export async function GET(request: NextRequest) {
  // Check admin authentication
  const session = await getServerSession(authOptionsEnhanced);
  const isAdmin = (session?.user as { isAdmin: boolean })?.isAdmin;
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const carrier = searchParams.get("carrier");
    const search = searchParams.get("search");

    // Build where clause using Prisma types
    const whereClause: Prisma.ShipmentWhereInput = {};

    if (status) {
      whereClause.status = status;
    }

    if (carrier) {
      whereClause.carrier = carrier;
    }

    if (search) {
      const or: Prisma.ShipmentWhereInput[] = [];
      or.push({
        trackingNumber: {
          contains: search,
          mode: "insensitive" as Prisma.QueryMode,
        },
      });
      or.push({
        order: {
          is: {
            email: {
              contains: search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
        },
      });
      or.push({
        order: {
          is: {
            id: {
              contains: search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
        },
      });
      whereClause.OR = or;
    }

    // Check if shipment table exists and get shipments with pagination
    let shipmentsRaw: ShipmentRow[] = [];
    let total = 0;

    try {
      const [resultShipments, resultTotal] = await Promise.all([
        prisma.shipment.findMany({
          where: whereClause,
          include: {
            order: {
              select: {
                id: true,
                email: true,
                status: true,
                totalCents: true,
                createdAt: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.shipment.count({ where: whereClause }),
      ]);
      shipmentsRaw = resultShipments as unknown as ShipmentRow[];
      total = resultTotal;
    } catch (error) {
      logger.warn("Shipment table not available yet:", {
        error:
          error instanceof Error
            ? error.message
            : typeof error === "string"
            ? error
            : "unknown",
      });
      // Return empty data if shipment table doesn't exist
      shipmentsRaw = [];
      total = 0;
    }

    return NextResponse.json({
      shipments: shipmentsRaw.map((shipment) => ({
        id: shipment.id,
        orderId: shipment.orderId,
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
        service: shipment.service,
        status: shipment.status,
        cost: shipment.cost,
        estimatedDelivery: shipment.estimatedDelivery,
        actualDelivery: shipment.actualDelivery,
        createdAt: shipment.createdAt,
        lastTrackedAt: shipment.lastTrackedAt,
        order: {
          id: shipment.order?.id ?? "",
          email: shipment.order?.email ?? "",
          status: shipment.order?.status ?? "UNKNOWN",
          total: (shipment.order?.totalCents ?? 0) / 100,
          customerName:
            `${shipment.order?.user?.firstName || ""} ${
              shipment.order?.user?.lastName || ""
            }`.trim() || "Guest",
          createdAt: shipment.order?.createdAt ?? shipment.createdAt,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching shipments:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Check admin authentication
  const session = await getServerSession(authOptionsEnhanced);
  const isAdmin = (session?.user as { isAdmin: boolean })?.isAdmin;
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();

    switch (data.action) {
      case "refresh_tracking":
        await ShippingService.updateAllShipmentTracking();
        return NextResponse.json({ success: true });

      case "refresh_single":
        if (!data.trackingNumber) {
          return NextResponse.json(
            { error: "Tracking number required" },
            { status: 400 }
          );
        }

        const tracking = await TrackingService.getTrackingStatus(data.orderId);
        if (tracking) {
          // Force update from carrier
          await ShippingService.updateAllShipmentTracking();
        }

        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("Error handling shipment action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
