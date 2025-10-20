import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateDefaultAddresses() {
  try {
    // Find all users who have addresses
    const usersWithAddresses = await prisma.user.findMany({
      include: {
        addresses: {
          orderBy: { createdAt: "asc" },
        },
      },
      where: {
        addresses: {
          some: {},
        },
      },
    });

    console.log(`Found ${usersWithAddresses.length} users with addresses`);

    for (const user of usersWithAddresses) {
      // Check if any address is already marked as default
      const hasDefault = user.addresses.some((addr) => addr.isDefault);

      if (!hasDefault && user.addresses.length > 0) {
        // Set the first (oldest) address as default
        const firstAddress = user.addresses[0];

        await prisma.address.update({
          where: { id: firstAddress.id },
          data: { isDefault: true },
        });

        console.log(
          `Set default address for user ${user.email}: ${firstAddress.city}`
        );
      }
    }

    // Show the updated addresses
    const allAddresses = await prisma.address.findMany({
      include: {
        user: {
          select: { email: true },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    console.log("\nUpdated addresses:");
    allAddresses.forEach((addr) => {
      console.log(
        `${addr.user?.email || "Unknown"}: ${addr.city} (${
          addr.isDefault ? "DEFAULT" : "secondary"
        })`
      );
    });

    console.log("\nDefault address update completed!");
  } catch (error) {
      console.error("Error:", error);
    console.error("Error updating default addresses:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDefaultAddresses();
