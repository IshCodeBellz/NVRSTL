import { PrismaClient } from "@prisma/client";

// Prevent multiple instances in dev (Next.js hot reload)
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __prismaDisconnected: boolean | undefined;
}

export const prisma = global.__prisma || new PrismaClient();

// Track a simple disconnected flag for tests that call prisma.$disconnect()
if (typeof global !== "undefined") {
  if (!global.__prisma) {
    // attach a disconnected flag
    global.__prismaDisconnected = false;
    const origDisconnect = prisma.$disconnect.bind(prisma);
    prisma.$disconnect = async function () {
      global.__prismaDisconnected = true;
      return origDisconnect();
    };
    const origConnect = prisma.$connect.bind(prisma);
    prisma.$connect = async function () {
      const result = await origConnect();
      global.__prismaDisconnected = false;
      return result;
    };
  }
}
if (process.env.NODE_ENV !== "production") global.__prisma = prisma;

export type { Prisma } from "@prisma/client";
