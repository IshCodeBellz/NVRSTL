import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.update({
      where: { email: "test@example.com" },
      data: { isAdmin: true },
    });
    console.log("Test user is now admin:", user.email, user.isAdmin);
  } catch (error) {
    console.error("Error updating user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
