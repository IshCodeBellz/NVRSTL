import { prisma } from "@/lib/server/prisma";

async function checkAndPrepareOrders() {
  try {
    console.log("🔍 Checking existing orders...");

    // Get all orders with their current status
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        status: true,
        totalCents: true,
        createdAt: true,
        email: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    if (orders.length === 0) {
      console.log("❌ No orders found in database");
      console.log("💡 You may need to create some test orders first");
      return;
    }

    console.log(`📊 Found ${orders.length} orders:`);

    // Group by status
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("Status breakdown:", statusCounts);

    // Check how many are suitable for shipments
    const suitableOrders = orders.filter((order) =>
      ["PAID", "FULFILLING", "SHIPPED"].includes(order.status)
    );

    console.log(
      `\n✅ ${suitableOrders.length} orders are suitable for shipments`
    );

    if (suitableOrders.length === 0) {
      console.log("\n🔧 Converting some orders to suitable statuses...");

      // Take up to 10 orders and convert them to PAID status
      const ordersToUpdate = orders.slice(0, Math.min(10, orders.length));
      const newStatuses = ["PAID", "FULFILLING", "SHIPPED"];

      for (const order of ordersToUpdate) {
        const newStatus =
          newStatuses[Math.floor(Math.random() * newStatuses.length)];

        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: newStatus,
            paidAt: newStatus !== "PENDING" ? new Date() : null,
          },
        });

        const customerName = order.user
          ? `${order.user.firstName || ""} ${
              order.user.lastName || ""
            }`.trim() || "Guest"
          : "Guest";

        console.log(
          `📝 Updated order ${order.id.slice(
            0,
            8
          )} (${customerName}) to ${newStatus}`
        );
      }

      console.log(
        `\n✅ Updated ${ordersToUpdate.length} orders for shipment creation`
      );
    }

    // Show sample orders
    console.log("\n📋 Recent suitable orders:");
    const displayOrders = orders
      .filter((order) =>
        ["PAID", "FULFILLING", "SHIPPED"].includes(order.status)
      )
      .slice(0, 5);

    displayOrders.forEach((order) => {
      const customerName = order.user
        ? `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim() ||
          "Guest"
        : "Guest";

      console.log(
        `├─ ${order.id.slice(0, 8)} | ${order.status} | £${(
          order.totalCents / 100
        ).toFixed(2)} | ${customerName}`
      );
    });

    console.log("\n🚀 Ready to create shipments! Run:");
    console.log("npx tsx seed-production-shipments.ts");
  } catch (error) {
    console.error("❌ Error checking orders:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndPrepareOrders();
