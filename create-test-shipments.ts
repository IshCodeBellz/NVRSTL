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

async function createProductionTestShipments() {
  try {
    console.log("🚀 Creating production-ready test shipments...");

    // Check if shipments already exist
    const existingShipments = await (prisma as any).shipment.count();
    if (existingShipments > 0) {
      console.log(
        `⚠️  Found ${existingShipments} existing shipments. Skipping creation.`
      );
      console.log(
        "💡 Delete existing shipments if you want to recreate test data."
      );
      return;
    }

    // Find paid orders to create shipments for
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["PAID", "FULFILLING", "SHIPPED"] },
      },
      take: 15, // Create more comprehensive test data
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
    const carriers = ["ROYAL_MAIL", "DPD", "FEDEX", "UPS"];
    const services = ["Standard", "Express", "Next Day"];
    const statuses = [
      "PENDING",
      "SHIPPED",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ];
    const statusWeights = [0.1, 0.3, 0.3, 0.2, 0.1]; // Realistic distribution

    for (let i = 0; i < Math.min(orders.length, 3); i++) {
      const order = orders[i];
      const carrier = carriers[Math.floor(Math.random() * carriers.length)];
      const service = services[Math.floor(Math.random() * services.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      // Generate tracking number
      const trackingNumber = `${carrier.slice(0, 2)}${Date.now()
        .toString()
        .slice(-8)}${Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, "0")}`;

      // Create estimated delivery date (1-5 days from now)
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(
        estimatedDelivery.getDate() + Math.floor(Math.random() * 5) + 1
      );

      const shipment = await (prisma as any).shipment.create({
        data: {
          orderId: order.id,
          trackingNumber,
          carrier,
          service,
          status,
          cost: Math.floor(Math.random() * 1000) + 500, // £5-15 shipping cost
          estimatedDelivery,
          createdAt: new Date(
            Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000
          ), // Random date in last 7 days
        },
      });

      console.log(
        `✅ Created shipment: ${
          shipment.trackingNumber
        } for order ${order.id.slice(0, 8)}`
      );
    }

    console.log("🎉 Test shipments created successfully!");
  } catch (error) {
    console.error("❌ Error creating test shipments:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createProductionTestShipments();
