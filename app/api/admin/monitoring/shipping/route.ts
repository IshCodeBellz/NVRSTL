import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { logger, withRequest, requireAuth } from "@/lib/server/logger";
import { trackPerformance } from "@/lib/server/errors";

// Define shipment status and carrier types based on our implementation
type ShipmentStatus =
  | "LABEL_CREATED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "EXCEPTION"
  | "FAILED";
type CarrierType = "ROYAL_MAIL" | "DPD" | "DHL" | "FEDEX" | "UPS";

interface ShippingMetrics {
  overview: {
    total_shipments: number;
    active_shipments: number;
    delivered_shipments: number;
    failed_shipments: number;
    pending_shipments: number;
  };
  carrier_performance: Array<{
    carrier: CarrierType;
    total_shipments: number;
    success_rate: number;
    avg_delivery_time_hours: number | null;
    failed_shipments: number;
  }>;
  recent_failures: Array<{
    id: string;
    tracking_number: string;
    carrier: CarrierType;
    status: ShipmentStatus;
    error_message: string | null;
    created_at: string;
    order_id: string;
  }>;
  delivery_performance: {
    on_time_delivery_rate: number;
    avg_delivery_time_hours: number | null;
    sla_breaches: number;
  };
  webhook_health: {
    total_received: number;
    failed_processing: number;
    success_rate: number;
    last_24h: number;
  };
  alerts: Array<{
    type:
      | "carrier_down"
      | "high_failure_rate"
      | "sla_breach"
      | "webhook_failure";
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    count: number;
    first_seen: string;
  }>;
}

// GET /api/admin/monitoring/shipping - Comprehensive shipping monitoring dashboard
export const GET = withRequest(async function GET(request) {
  const perf = trackPerformance("shipping_monitoring", {
    route: "/api/admin/monitoring/shipping",
  });

  try {
    // Ensure user is authenticated and is admin
    const user = await requireAuth(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Overview metrics
    const [
      totalShipments,
      activeShipments,
      deliveredShipments,
      failedShipments,
      pendingShipments,
    ] = await Promise.all([
      prisma.shipment.count(),
      prisma.shipment.count({
        where: {
          status: {
            in: ["PROCESSING", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
          },
        },
      }),
      prisma.shipment.count({
        where: { status: "DELIVERED" },
      }),
      prisma.shipment.count({
        where: { status: "FAILED" },
      }),
      prisma.shipment.count({
        where: { status: "PENDING" },
      }),
    ]);

    // Carrier performance analysis
    const carrierStats = await prisma.shipment.groupBy({
      by: ["carrier"],
      _count: { id: true },
      _avg: {
        // Calculate average delivery time in hours
        cost: true,
      },
      where: {
        createdAt: { gte: last7Days },
      },
    });

    const CARRIERS: CarrierType[] = [
      "ROYAL_MAIL",
      "DPD",
      "DHL",
      "FEDEX",
      "UPS",
    ];
    const toCarrierType = (c: string): CarrierType =>
      (CARRIERS.includes(c as CarrierType) ? c : "UPS") as CarrierType;

    const STATUSES: ShipmentStatus[] = [
      "LABEL_CREATED",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "EXCEPTION",
      "FAILED",
    ];
    const toShipmentStatus = (s: string): ShipmentStatus =>
      (STATUSES.includes(s as ShipmentStatus)
        ? s
        : "EXCEPTION") as ShipmentStatus;

    const carrierPerformance = await Promise.all(
      carrierStats.map(async (stat) => {
        const [successCount, failedCount] = await Promise.all([
          prisma.shipment.count({
            where: {
              carrier: stat.carrier,
              status: "DELIVERED",
              createdAt: { gte: last7Days },
            },
          }),
          prisma.shipment.count({
            where: {
              carrier: stat.carrier,
              status: "FAILED",
              createdAt: { gte: last7Days },
            },
          }),
        ]);

        // Calculate average delivery time
        const avgDeliveryTime = await prisma.$queryRaw<
          Array<{ avg_hours: number }>
        >`
          SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 3600) as avg_hours
          FROM "Shipment"
          WHERE carrier = ${stat.carrier}
            AND status = 'DELIVERED'
            AND created_at >= ${last7Days}
            AND delivered_at IS NOT NULL
        `;

        return {
          carrier: toCarrierType(String(stat.carrier)),
          total_shipments: stat._count?.id || 0,
          success_rate:
            stat._count?.id && stat._count.id > 0
              ? (successCount / stat._count.id) * 100
              : 0,
          avg_delivery_time_hours: avgDeliveryTime[0]?.avg_hours || null,
          failed_shipments: failedCount,
        };
      })
    );

    // Get recent failures
    const recentFailures = await prisma.shipment.findMany({
      where: {
        createdAt: { gte: last7Days },
        status: { in: ["EXCEPTION", "FAILED"] },
      },
      select: {
        id: true,
        trackingNumber: true,
        carrier: true,
        status: true,
        createdAt: true,
        orderId: true,
      },
    });

    // Delivery performance
    const deliveredShipmentsLast7Days = await prisma.shipment.findMany({
      where: {
        status: "DELIVERED",
        createdAt: { gte: last7Days },
        actualDelivery: { not: null },
      },
      select: {
        createdAt: true,
        actualDelivery: true,
        estimatedDelivery: true,
      },
    });

    let onTimeDeliveries = 0;
    let totalDeliveryTimeHours = 0;
    let slaBreaches = 0;

    deliveredShipmentsLast7Days.forEach((shipment) => {
      if (shipment.actualDelivery) {
        const deliveryTime =
          shipment.actualDelivery.getTime() - shipment.createdAt.getTime();
        totalDeliveryTimeHours += deliveryTime / (1000 * 60 * 60);

        if (shipment.estimatedDelivery) {
          if (shipment.actualDelivery <= shipment.estimatedDelivery) {
            onTimeDeliveries++;
          } else {
            slaBreaches++;
          }
        }
      }
    });

    const deliveryPerformance = {
      on_time_delivery_rate:
        deliveredShipmentsLast7Days.length > 0
          ? (onTimeDeliveries / deliveredShipmentsLast7Days.length) * 100
          : 0,
      avg_delivery_time_hours:
        deliveredShipmentsLast7Days.length > 0
          ? totalDeliveryTimeHours / deliveredShipmentsLast7Days.length
          : null,
      sla_breaches: slaBreaches,
    };

    // Webhook health (placeholder - implement when webhook logging is added)
    const webhookHealth = {
      total_received: 0,
      failed_processing: 0,
      success_rate: 100,
      last_24h: 0,
    };

    // Generate alerts based on metrics
    const alerts: ShippingMetrics["alerts"] = [];

    // Check for high failure rates
    carrierPerformance.forEach((carrier) => {
      if (carrier.success_rate < 95 && carrier.total_shipments > 10) {
        alerts.push({
          type: "high_failure_rate",
          severity: carrier.success_rate < 85 ? "critical" : "high",
          message: `${carrier.carrier} has ${carrier.success_rate.toFixed(
            1
          )}% success rate`,
          count: carrier.failed_shipments,
          first_seen: last24Hours.toISOString(),
        });
      }
    });

    // Check for SLA breaches
    if (slaBreaches > 5) {
      alerts.push({
        type: "sla_breach",
        severity: slaBreaches > 20 ? "critical" : "high",
        message: `${slaBreaches} SLA breaches in the last 7 days`,
        count: slaBreaches,
        first_seen: last7Days.toISOString(),
      });
    }

    // Check for recent failures spike
    if (recentFailures.length > 10) {
      alerts.push({
        type: "high_failure_rate",
        severity: recentFailures.length > 20 ? "critical" : "medium",
        message: `${recentFailures.length} shipment failures in the last 24 hours`,
        count: recentFailures.length,
        first_seen: last24Hours.toISOString(),
      });
    }

    const metrics: ShippingMetrics = {
      overview: {
        total_shipments: totalShipments,
        active_shipments: activeShipments,
        delivered_shipments: deliveredShipments,
        failed_shipments: failedShipments,
        pending_shipments: pendingShipments,
      },
      carrier_performance: carrierPerformance,
      recent_failures: recentFailures.map((failure) => ({
        id: failure.id,
        tracking_number: failure.trackingNumber || "N/A",
        carrier: toCarrierType(String(failure.carrier)),
        status: toShipmentStatus(String(failure.status)),
        error_message: null, // No error message field in schema
        created_at: failure.createdAt.toISOString(),
        order_id: failure.orderId,
      })),
      delivery_performance: deliveryPerformance,
      webhook_health: webhookHealth,
      alerts: alerts,
    };

    perf.finish("ok");
    return NextResponse.json(metrics, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    logger.error("Shipping monitoring error:", error);
    perf.finish("error");

    return NextResponse.json(
      { error: "Failed to fetch shipping metrics" },
      { status: 500 }
    );
  }
});
