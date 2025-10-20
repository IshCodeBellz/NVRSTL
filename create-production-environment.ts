import { prisma } from "@/lib/server/prisma";

interface CustomerProfile {
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  country: string;
}

const SAMPLE_CUSTOMERS: CustomerProfile[] = [
  {
    firstName: "Emma",
    lastName: "Wilson",
    email: "emma.wilson@example.com",
    city: "London",
    country: "United Kingdom",
  },
  {
    firstName: "James",
    lastName: "Smith",
    email: "james.smith@example.com",
    city: "Manchester",
    country: "United Kingdom",
  },
  {
    firstName: "Sophie",
    lastName: "Brown",
    email: "sophie.brown@example.com",
    city: "Birmingham",
    country: "United Kingdom",
  },
  {
    firstName: "Oliver",
    lastName: "Jones",
    email: "oliver.jones@example.com",
    city: "Liverpool",
    country: "United Kingdom",
  },
  {
    firstName: "Isabella",
    lastName: "Davis",
    email: "isabella.davis@example.com",
    city: "Bristol",
    country: "United Kingdom",
  },
  {
    firstName: "William",
    lastName: "Miller",
    email: "william.miller@example.com",
    city: "Leeds",
    country: "United Kingdom",
  },
  {
    firstName: "Charlotte",
    lastName: "Garcia",
    email: "charlotte.garcia@example.com",
    city: "Sheffield",
    country: "United Kingdom",
  },
  {
    firstName: "Henry",
    lastName: "Rodriguez",
    email: "henry.rodriguez@example.com",
    city: "Newcastle",
    country: "United Kingdom",
  },
  {
    firstName: "Amelia",
    lastName: "Martinez",
    email: "amelia.martinez@example.com",
    city: "Glasgow",
    country: "United Kingdom",
  },
  {
    firstName: "Alexander",
    lastName: "Anderson",
    email: "alex.anderson@example.com",
    city: "Edinburgh",
    country: "United Kingdom",
  },
];

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
    costRange: [350, 1200],
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

async function createProductionTestData() {
  try {
    console.log("🚀 Creating complete production test environment...");
    console.log("├─ Step 1: Creating test users and orders");
    console.log("└─ Step 2: Creating realistic shipment data\n");

    // Check existing data
    const existingOrders = await prisma.order.count();
    const existingShipments = await (prisma as any).shipment.count();

    if (existingOrders > 0 || existingShipments > 0) {
      console.log(
        `⚠️  Existing data found: ${existingOrders} orders, ${existingShipments} shipments`
      );
      console.log("💡 This will add to existing data. Continue...\n");
    }

    // Get some products for orders
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        sizeVariants: { where: { stock: { gt: 0 } } },
        brand: true,
        category: true,
      },
      take: 20,
    });

    if (products.length === 0) {
      console.log(
        "❌ No products found. Please ensure you have products in your database."
      );
      return;
    }

    console.log(`📦 Found ${products.length} products available for orders`);

    const createdUsers = [];
    const createdOrders = [];
    const createdShipments = [];

    // Create orders for the past 30 days
    const ordersToCreate = 25;
    const orderStatuses = ["PAID", "FULFILLING", "SHIPPED"];

    for (let i = 0; i < ordersToCreate; i++) {
      const customer = SAMPLE_CUSTOMERS[i % SAMPLE_CUSTOMERS.length];

      // Create or find user
      let user = await prisma.user.findUnique({
        where: { email: customer.email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            passwordHash: "placeholder_hash", // Placeholder for production
            emailVerified: true,
            createdAt: new Date(
              Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
            ), // Random date in last 30 days
          },
        });
        createdUsers.push(user);
      }

      // Create realistic order
      const orderDate = new Date(
        Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000
      ); // Last 25 days
      const itemCount = Math.floor(Math.random() * 4) + 1; // 1-4 items per order
      const selectedProducts = products
        .sort(() => 0.5 - Math.random())
        .slice(0, itemCount);

      let totalCents = 0;
      const orderItems = [];

      for (const product of selectedProducts) {
        const qty = Math.floor(Math.random() * 2) + 1; // 1-2 of each item
        const availableSizes = product.sizeVariants.filter(
          (sv) => sv.stock > 0
        );
        const selectedSize =
          availableSizes[Math.floor(Math.random() * availableSizes.length)];

        if (selectedSize) {
          const itemTotal = product.priceCents * qty;
          totalCents += itemTotal;

          orderItems.push({
            productId: product.id,
            sku: product.sku,
            nameSnapshot: product.name,
            size: selectedSize.label,
            qty: qty,
            unitPriceCents: product.priceCents,
            lineTotalCents: itemTotal,
            priceCentsSnapshot: product.priceCents,
          });
        }
      }

      if (orderItems.length === 0) continue;

      // Add shipping cost
      const shippingCost = Math.floor(Math.random() * 800) + 400; // £4-12 shipping
      totalCents += shippingCost;

      // Create address for shipping
      const shippingAddr = await prisma.address.create({
        data: {
          fullName: `${customer.firstName} ${customer.lastName}`,
          line1: `${Math.floor(Math.random() * 999) + 1} ${
            [
              "High Street",
              "Main Road",
              "Church Lane",
              "Victoria Road",
              "Oak Avenue",
            ][Math.floor(Math.random() * 5)]
          }`,
          city: customer.city,
          postalCode: `${
            ["SW", "NW", "SE", "NE", "W", "E", "N", "S"][
              Math.floor(Math.random() * 8)
            ]
          }${Math.floor(Math.random() * 20) + 1} ${
            Math.floor(Math.random() * 9) + 1
          }${["AA", "BB", "DD", "FF", "GG"][Math.floor(Math.random() * 5)]}`,
          country: customer.country,
          userId: user.id,
        },
      });

      const order = await prisma.order.create({
        data: {
          userId: user.id,
          email: user.email,
          status:
            orderStatuses[Math.floor(Math.random() * orderStatuses.length)],
          subtotalCents: totalCents - shippingCost,
          shippingCents: shippingCost,
          taxCents: 0,
          discountCents: 0,
          totalCents,
          currency: "GBP",
          createdAt: orderDate,
          paidAt: orderDate,
          shippingAddressId: shippingAddr.id,
          billingAddressId: shippingAddr.id,
          items: {
            create: orderItems,
          },
        },
        include: { items: true, user: true },
      });

      createdOrders.push(order);
      console.log(
        `📝 Created order ${order.id.slice(0, 8)} | ${order.status} | £${(
          order.totalCents / 100
        ).toFixed(2)} | ${customer.firstName} ${customer.lastName}`
      );
    }

    console.log(
      `\n✅ Created ${createdOrders.length} orders with realistic data`
    );

    // Now create shipments for these orders
    console.log("\n📦 Creating shipments for orders...");

    const shipmentStatuses = [
      "PENDING",
      "SHIPPED",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ];
    const statusWeights = [0.1, 0.3, 0.3, 0.2, 0.1];

    for (const order of createdOrders) {
      // Smart carrier selection based on order value
      const orderValue = order.totalCents;
      let selectedCarrier: keyof typeof CARRIERS;

      if (orderValue > 10000) {
        selectedCarrier = Math.random() < 0.6 ? "DHL" : "FEDEX";
      } else if (orderValue > 5000) {
        selectedCarrier = Math.random() < 0.5 ? "DPD" : "UPS";
      } else {
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
          selectedStatus = shipmentStatuses[i];
          break;
        }
      }

      // Generate tracking number
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
      const itemWeightFactor = 0.3; // Estimated weight factor
      const shippingCost = Math.floor(baseCost * (1 + itemWeightFactor));

      // Delivery timing
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
      console.log(
        `🚚 ${trackingNumber} | ${selectedCarrier} | ${selectedStatus} | Order ${order.id.slice(
          0,
          8
        )}`
      );
    }

    // Summary
    console.log(`\n🎉 Production test environment created successfully!`);
    console.log(`\n📊 Summary:`);
    console.log(`├─ Users: ${createdUsers.length} created`);
    console.log(`├─ Orders: ${createdOrders.length} created`);
    console.log(`└─ Shipments: ${createdShipments.length} created`);

    const statusCounts = createdShipments.reduce((acc: any, shipment: any) => {
      acc[shipment.status] = (acc[shipment.status] || 0) + 1;
      return acc;
    }, {});

    const carrierCounts = createdShipments.reduce((acc: any, shipment: any) => {
      acc[shipment.carrier] = (acc[shipment.carrier] || 0) + 1;
      return acc;
    }, {});

    const totalShippingCost = createdShipments.reduce(
      (sum: number, shipment: any) => sum + shipment.cost,
      0
    );
    const totalOrderValue = createdOrders.reduce(
      (sum: number, order: any) => sum + order.totalCents,
      0
    );

    console.log(`\n📈 Business Metrics:`);
    console.log(`├─ Total Order Value: £${(totalOrderValue / 100).toFixed(2)}`);
    console.log(
      `├─ Total Shipping Cost: £${(totalShippingCost / 100).toFixed(2)}`
    );
    console.log(
      `├─ Avg Order Value: £${(
        totalOrderValue /
        createdOrders.length /
        100
      ).toFixed(2)}`
    );
    console.log(
      `└─ Shipping as % of Order Value: ${(
        (totalShippingCost / totalOrderValue) *
        100
      ).toFixed(1)}%`
    );

    console.log(`\n📋 Status Distribution:`, statusCounts);
    console.log(`📋 Carrier Distribution:`, carrierCounts);

    console.log(`\n🎯 Ready to explore your production dashboard:`);
    console.log(
      `├─ 🌐 Admin Shipping Dashboard: http://localhost:3000/admin/shipping`
    );
    console.log(
      `├─ 📱 Customer Tracking Portal: http://localhost:3000/tracking`
    );
    console.log(`├─ 📋 Orders Management: http://localhost:3000/admin/orders`);
    console.log(
      `├─ 🔔 Notifications Dashboard: http://localhost:3000/admin/notifications`
    );
    console.log(`└─ 🏠 Main Admin Dashboard: http://localhost:3000/admin`);
  } catch (error) {
    console.error("❌ Error creating production test data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createProductionTestData();
