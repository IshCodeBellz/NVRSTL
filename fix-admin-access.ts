import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkAndFixAdmin() {
  try {
    // Check current user status
    const user = await prisma.user.findUnique({
      where: { email: "ahmbello@hotmail.com" },
      select: { email: true, isAdmin: true, name: true },
    });

    console.log("Current user:", user);

    if (user && !user.isAdmin) {
      // Make user admin
      const updatedUser = await prisma.user.update({
        where: { email: "ahmbello@hotmail.com" },
        data: { isAdmin: true },
      });

      console.log(
        "Updated user to admin:",
        updatedUser.email,
        "isAdmin:",
        updatedUser.isAdmin
      );
    } else if (user?.isAdmin) {
      console.log("User is already admin!");
    } else {
      console.log("User not found");
    }

    // Also check test user
    const testUser = await prisma.user.findUnique({
      where: { email: "test@example.com" },
      select: { email: true, isAdmin: true },
    });

    console.log("Test user:", testUser);

    if (testUser && !testUser.isAdmin) {
      await prisma.user.update({
        where: { email: "test@example.com" },
        data: { isAdmin: true },
      });
      console.log("Updated test user to admin");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixAdmin();
