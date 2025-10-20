import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { error as logError } from "@/lib/server/logger";
import { validateAndNormalizeAddress } from "@/lib/server/address/validateAddress";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        addresses: {
          orderBy: [
            { isDefault: "desc" }, // Default address first
            { createdAt: "desc" }, // Then by creation date
          ],
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user.addresses);
  } catch (error) {
    logError("Error fetching addresses", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { fullName, line1, line2, city, region, postalCode, country, phone } =
      body;

    // Validate required fields
    if (!fullName || !line1 || !city || !postalCode || !country) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Optional server-side validation/normalization (skips if no token)
    const validation = await validateAndNormalizeAddress({
      fullName,
      line1,
      line2: line2 || null,
      city,
      region: region || null,
      postalCode,
      country,
      phone: phone || null,
    });
    if (validation && validation.valid === false) {
      return NextResponse.json(
        { error: "Invalid address", reason: validation.reason },
        { status: 422 }
      );
    }

    const normalized = validation.normalized || {};

    // Check if this is the user's first address
    const existingAddressCount = await prisma.address.count({
      where: { userId: user.id },
    });

    const address = await prisma.address.create({
      data: {
        userId: user.id,
        fullName,
        line1: (normalized.line1 as string) || line1,
        line2: (normalized.line2 as string | null) ?? (line2 || null),
        city: (normalized.city as string) || city,
        region: (normalized.region as string | null) ?? (region || null),
        postalCode: (normalized.postalCode as string) || postalCode,
        country: (normalized.country as string) || country,
        phone: phone || null,
        isDefault: existingAddressCount === 0, // First address is automatically default
      },
    });

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    logError("Error creating address", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}
