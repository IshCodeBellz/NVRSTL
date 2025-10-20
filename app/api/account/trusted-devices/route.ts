import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { generateDeviceFingerprint } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  // Return trusted devices for the authenticated user
  const session = await getServerSession(authOptionsEnhanced);
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 }
    );
  }

  const trusted = await prisma.trustedDevice.findMany({
    where: { userId: session.user.id, trusted: true },
    orderBy: { lastUsed: "desc" },
  });

  return NextResponse.json({ devices: trusted });
}

export async function POST(request: NextRequest) {
  // Trust or untrust a device using a sessionId reference or explicit deviceId
  try {
    const session = await getServerSession(authOptionsEnhanced);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      sessionId?: string;
      deviceId?: string;
      trust: boolean;
      name?: string;
    };

    if (!body?.sessionId && !body?.deviceId) {
      return NextResponse.json(
        { message: "sessionId or deviceId required" },
        { status: 400 }
      );
    }

    let deviceId = body.deviceId;
    let name = body.name;
    let userAgent: string | undefined;
    let ipAddress: string | undefined;

    if (!deviceId && body.sessionId) {
      const s = await prisma.userSession.findFirst({
        where: { id: body.sessionId, userId: session.user.id },
        select: { userAgent: true, ipAddress: true },
      });
      if (!s) {
        return NextResponse.json(
          { message: "Session not found" },
          { status: 404 }
        );
      }
      userAgent = s.userAgent || "unknown";
      ipAddress = s.ipAddress || "unknown";
      deviceId = generateDeviceFingerprint(userAgent, ipAddress);
      // Default name if none provided
      name = name || (userAgent ? userAgent.substring(0, 64) : "Device");
    }

    if (!deviceId) {
      return NextResponse.json(
        { message: "Failed to resolve deviceId" },
        { status: 400 }
      );
    }

    // Upsert trusted device record
    await prisma.trustedDevice.upsert({
      where: { userId_deviceId: { userId: session.user.id, deviceId } },
      update: {
        trusted: body.trust,
        lastUsed: new Date(),
        name: name || undefined,
      },
      create: {
        userId: session.user.id,
        deviceId,
        name: name || "Device",
        userAgent: userAgent || "unknown",
        ipAddress: ipAddress || "unknown",
        trusted: body.trust,
        lastUsed: new Date(),
      },
    });

    return NextResponse.json({ success: true, deviceId, trusted: body.trust });
  } catch {
    return NextResponse.json(
      { message: "Failed to update trusted device" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Untrust a device; can be referenced by sessionId or deviceId
  try {
    const session = await getServerSession(authOptionsEnhanced);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      sessionId?: string;
      deviceId?: string;
    };
    if (!body?.sessionId && !body?.deviceId) {
      return NextResponse.json(
        { message: "sessionId or deviceId required" },
        { status: 400 }
      );
    }

    let deviceId = body.deviceId;
    if (!deviceId && body.sessionId) {
      const s = await prisma.userSession.findFirst({
        where: { id: body.sessionId, userId: session.user.id },
        select: { userAgent: true, ipAddress: true },
      });
      if (!s) {
        return NextResponse.json(
          { message: "Session not found" },
          { status: 404 }
        );
      }
      deviceId = generateDeviceFingerprint(
        s.userAgent || "unknown",
        s.ipAddress || "unknown"
      );
    }

    if (!deviceId) {
      return NextResponse.json(
        { message: "Failed to resolve deviceId" },
        { status: 400 }
      );
    }

    await prisma.trustedDevice.updateMany({
      where: { userId: session.user.id, deviceId },
      data: { trusted: false, expiresAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Failed to untrust device" },
      { status: 500 }
    );
  }
}
