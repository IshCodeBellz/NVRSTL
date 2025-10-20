import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total notifications
    const total = await prisma.notification.count();

    // Get notifications by read status (using as proxy for delivery status)
    const unread = await prisma.notification.count({
      where: { read: false },
    });

    const read = await prisma.notification.count({
      where: { read: true },
    });

    // Get notifications by type
    const typeStats = await prisma.notification.groupBy({
      by: ["type"],
      _count: {
        id: true,
      },
    });

    const byType: Record<string, number> = {};
    typeStats.forEach((stat: { type: string; _count: { id: number } }) => {
      byType[stat.type] = stat._count.id;
    });

    // Get notifications from last 24 hours
    const last24Hours = await prisma.notification.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    return NextResponse.json({
      total,
      pending: unread, // Using unread as proxy for pending
      sent: read, // Using read as proxy for sent
      failed: 0, // Would need proper delivery tracking for this
      byType,
      last24Hours,
    });
  } catch (error) {
    logger.error("Failed to fetch notification stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
