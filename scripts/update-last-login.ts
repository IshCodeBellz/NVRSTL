import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateLastLogin() {
  try {
    // Update all users to have a recent last login for testing
    const result = await prisma.user.updateMany({
      data: {
        lastLoginAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random time within last 24 hours
      },
    });

    console.log(`Updated lastLoginAt for ${result.count} users`);

    // Show the users with their last login times
    const users = await prisma.user.findMany({
      select: {
        email: true,
        lastLoginAt: true,
      },
    });

    console.log("Users with last login times:");
    users.forEach((user) => {
      console.log(
        `${user.email}: ${user.lastLoginAt?.toLocaleString() || "Never"}`
      );
    });
  } catch (error) {
      console.error("Error:", error);
    console.error("Error updating last login:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateLastLogin();
