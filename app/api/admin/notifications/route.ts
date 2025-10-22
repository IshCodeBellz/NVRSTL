import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { logger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

type NotificationWithRelations = {
  id: string;
  title: string;
  message: string;
  type: string;
  userId: string;
  orderId: string | null;
  read: boolean;
  createdAt: Date;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  order: { id: string; status: string } | null;
};

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const orderId = searchParams.get("orderId");

    // Build where clause for filtering
    const where: {
      read?: boolean;
      type?: string;
      orderId?: string;
    } = {};

    if (status) {
      // Note: In a real implementation, you'd need a deliveryStatus field in the Notification model
      // For now, we'll use the read status as a proxy
      if (status === "PENDING") {
        where.read = false;
      } else if (status === "SENT") {
        where.read = true;
      }
    }

    if (type) {
      where.type = type;
    }

    if (orderId) {
      where.orderId = orderId;
    }

    // Fetch notifications
    const notifications = await prisma.notification.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            name: true,
          },
        },
        order: {
          select: {
            id: true,
            totalCents: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    // Transform notifications for the frontend
    const transformedNotifications = notifications.map(
      (notification: NotificationWithRelations) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        userId: notification.userId,
        orderId: notification.orderId,
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
        // Mock delivery channels and status - in a real implementation, you'd have these fields
        channels: {
          email: true,
          sms: false,
          inApp: true,
        },
        deliveryStatus: notification.read ? "DELIVERED" : "SENT", // Mock status
        user: notification.user,
        order: notification.order,
      })
    );

    // Get total count for pagination
    const total = await prisma.notification.count({ where });

    return NextResponse.json({
      notifications: transformedNotifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
