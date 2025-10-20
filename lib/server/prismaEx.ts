import { prisma } from "./prisma";

// Central helper to access newer models when TS language service lags.
// Replace with direct prisma.* once types fully synchronized.
// Using any here is necessary for newer Prisma models not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prismaX = {
  ...prisma,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orderEvent: (prisma as any).orderEvent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  passwordResetToken: (prisma as any).passwordResetToken,
};

export type PrismaExtended = typeof prismaX;
