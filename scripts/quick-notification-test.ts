import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  let userId: string | null = null;
  let notificationId: string | null = null;
  try {
    // Create a temp user
    const user = await prisma.user.create({
      data: {
        email: `notif_test_${Date.now()}@example.com`,
        passwordHash: "dev-placeholder-hash",
        emailVerified: true,
      },
      select: { id: true },
    });
    userId = user.id;
    console.log("Created test user:", userId);

    // Create a notification
    const notif = await prisma.notification.create({
      data: {
        userId,
        title: "Test Notification",
        message: "This is a test notification.",
        type: "TEST",
        read: false,
      },
      select: { id: true, createdAt: true },
    });
    notificationId = notif.id;
    console.log(
      "Created notification:",
      notificationId,
      "at",
      notif.createdAt.toISOString()
    );

    // Count notifications
    const count = await prisma.notification.count();
    console.log("Notification count now:", count);

    // Read back notification
    const fetched = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    console.log(
      "Fetched notification:",
      fetched?.title,
      fetched?.type,
      fetched?.read
    );
  } catch (err) {
    console.error("Quick notification test failed:", err);
    process.exitCode = 1;
  } finally {
    // Cleanup best-effort
    try {
      if (notificationId) {
        await prisma.notification.delete({ where: { id: notificationId } });
        console.log("Deleted notification:", notificationId);
      }
      if (userId) {
        await prisma.user.delete({ where: { id: userId } });
        console.log("Deleted test user:", userId);
      }
    } catch (e) {
      // ignore cleanup errors
    }
    await prisma.$disconnect();
  }
}

main();
