import { prisma } from "./prisma";

// Central helper to access newer models when TS language service lags.
// Replace with direct prisma.* once types fully synchronized.
// Using any here is necessary for newer Prisma models not yet in generated types
export const prismaX = {
  ...prisma,
  orderEvent: (prisma as any).orderEvent,
  passwordResetToken: (prisma as any).passwordResetToken,
};

export type PrismaExtended = typeof prismaX;
