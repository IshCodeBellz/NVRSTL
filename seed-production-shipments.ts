import { prisma } from "@/lib/server/prisma";

interface CarrierConfig {
  name: string;
  services: string[];
  costRange: [number, number];
  deliveryDays: [number, number];
}

const CARRIERS: Record<string, CarrierConfig> = {
  ROYAL_MAIL: {
    name: "Royal Mail",
    services: ["First Class", "Second Class", "Special Delivery", "Tracked 24"],
    costRange: [350, 1200], // £3.50 - £12.00
    deliveryDays: [1, 3],
  },
  DPD: {
    name: "DPD",
    services: ["Next Day", "Express", "Classic"],
    costRange: [650, 1800],
    deliveryDays: [1, 2],
  },
  FEDEX: {
    name: "FedEx",
    services: ["Priority Overnight", "Standard Overnight", "2Day"],
    costRange: [1200, 3500],
    deliveryDays: [1, 3],
  },
  UPS: {
    name: "UPS",
    services: ["Next Day Air", "2nd Day Air", "Ground"],
    costRange: [800, 2500],
    deliveryDays: [1, 5],
  },
  DHL: {
    name: "DHL",
    services: ["Express", "Express Worldwide", "Economy"],
    costRange: [1500, 4500],
    deliveryDays: [1, 4],
  },
};

async function createProductionReadyShipments() {
  try {
    console.log("🚀 Creating production-ready test shipments...");

    // Check if shipments already exist
    const existingShipments = await (prisma as any).shipment.count();
    if (existingShipments > 0) {
      console.log(`⚠️  Found ${existingShipments} existing shipments.`);
      console.log(
        "💡 Delete existing shipments if you want to recreate test data."
      );
      console.log(`🔗 Current dashboard: http://localhost:3000/admin/shipping`);
      return;
    }

    // Find suitable orders
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["PAID", "FULFILLING", "SHIPPED"] },
      },
      take: 20,
      include: {
        user: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (orders.length === 0) {
      console.log("❌ No suitable orders found to create shipments for");
      console.log(
        "💡 Make sure you have orders with status PAID, FULFILLING, or SHIPPED"
      );
      return;
    }

    console.log(`📦 Found ${orders.length} orders suitable for shipments`);

    const createdShipments = [];
    const statuses = [
      "PENDING",
      "SHIPPED",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ];
    const statusWeights = [0.1, 0.3, 0.3, 0.2, 0.1]; // Realistic distribution

    for (const order of orders) {
      // Smart carrier selection based on order value
      const orderValue = order.totalCents;
      let selectedCarrier: keyof typeof CARRIERS;

      if (orderValue > 10000) {
        // Orders over £100
        selectedCarrier = Math.random() < 0.6 ? "DHL" : "FEDEX";
      } else if (orderValue > 5000) {
        // Orders over £50
        selectedCarrier = Math.random() < 0.5 ? "DPD" : "UPS";
      } else {
        // Lower value orders
        selectedCarrier = Math.random() < 0.7 ? "ROYAL_MAIL" : "DPD";
      }

      const carrierConfig = CARRIERS[selectedCarrier];
      const service =
        carrierConfig.services[
          Math.floor(Math.random() * carrierConfig.services.length)
        ];

      // Realistic status distribution
      const randomValue = Math.random();
      let cumulativeProbability = 0;
      let selectedStatus = "PENDING";

      for (let i = 0; i < statusWeights.length; i++) {
        cumulativeProbability += statusWeights[i];
        if (randomValue <= cumulativeProbability) {
          selectedStatus = statuses[i];
          break;
        }
      }

      // Generate professional tracking number
      const carrierPrefix = selectedCarrier.slice(0, 2);
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
      const trackingNumber = `${carrierPrefix}${timestamp}${random}GB`;

      // Calculate shipping cost
      const [minCost, maxCost] = carrierConfig.costRange;
      const baseCost =
        minCost + Math.floor(Math.random() * (maxCost - minCost));
      const itemWeightFactor = Math.min(order.items.length * 0.1, 0.5);
      const shippingCost = Math.floor(baseCost * (1 + itemWeightFactor));

      // Realistic delivery timing
      const [minDays, maxDays] = carrierConfig.deliveryDays;
      const deliveryDays =
        minDays + Math.floor(Math.random() * (maxDays - minDays + 1));

      const estimatedDelivery = new Date(order.createdAt);
      estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDays);

      const actualDelivery =
        selectedStatus === "DELIVERED"
          ? new Date(
              estimatedDelivery.getTime() -
                Math.floor(Math.random() * 24 * 60 * 60 * 1000)
            )
          : null;

      const createdAt = new Date(order.createdAt);
      createdAt.setHours(createdAt.getHours() + Math.floor(Math.random() * 24));

      try {
        const shipment = await (prisma as any).shipment.create({
          data: {
            orderId: order.id,
            trackingNumber,
            carrier: selectedCarrier,
            service,
            status: selectedStatus,
            cost: shippingCost,
            estimatedDelivery,
            actualDelivery,
            createdAt,
            lastTrackedAt:
              selectedStatus !== "PENDING"
                ? new Date(
                    Date.now() - Math.floor(Math.random() * 6 * 60 * 60 * 1000)
                  )
                : null,
          },
        });

        createdShipments.push(shipment);

        const customerName = order.user
          ? `${order.user.firstName || ""} ${
              order.user.lastName || ""
            }`.trim() || "Guest"
          : "Guest";

        console.log(
          `✅ ${trackingNumber} | ${selectedCarrier} ${service} | ${selectedStatus} | Order ${order.id.slice(
            0,
            8
          )} (${customerName})`
        );
      } catch (error) {
        console.error(
          `❌ Failed to create shipment for order ${order.id}:`,
          error
        );
      }
    }

    // Summary statistics
    console.log(
      `\n🎉 Successfully created ${createdShipments.length} production-ready shipments!`
    );

    const statusCounts = createdShipments.reduce((acc: any, shipment: any) => {
      acc[shipment.status] = (acc[shipment.status] || 0) + 1;
      return acc;
    }, {});

    const carrierCounts = createdShipments.reduce((acc: any, shipment: any) => {
      acc[shipment.carrier] = (acc[shipment.carrier] || 0) + 1;
      return acc;
    }, {});

    const totalCost = createdShipments.reduce(
      (sum: number, shipment: any) => sum + shipment.cost,
      0
    );

    console.log("\n📊 Summary Statistics:");
    console.log("├─ Status Distribution:", statusCounts);
    console.log("├─ Carrier Distribution:", carrierCounts);
    console.log(`└─ Total Shipping Cost: £${(totalCost / 100).toFixed(2)}`);

    console.log("\n🎯 Next Steps:");
    console.log("├─ 🌐 Admin Dashboard: http://localhost:3000/admin/shipping");
    console.log("├─ 📱 Customer Tracking: http://localhost:3000/tracking");
    console.log("└─ 📋 Orders Management: http://localhost:3000/admin/orders");
  } catch (error) {
    console.error("❌ Error creating production shipments:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createProductionReadyShipments();
