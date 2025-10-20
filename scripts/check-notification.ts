import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const exists = await prisma.$queryRaw<Array<{ t: string | null }>>`
      SELECT to_regclass('public."Notification"')::text as t;
    `;
    console.log("Notification table regclass:", exists?.[0]?.t ?? null);

    const count = await prisma.notification.count();
    console.log("Notification count:", count);
  } catch (err) {
    console.error("Notification table check failed:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
