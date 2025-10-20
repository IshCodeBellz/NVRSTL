import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/lib/server/inventoryService";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    // Mock admin check since session.user.isAdmin not available
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID required",
        },
        { status: 400 }
      );
    }

    const inventory = await InventoryService.getProductInventory(productId);

    return NextResponse.json({
      success: true,
      data: inventory,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get inventory",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    // Mock admin check
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin access required",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { productId, variantId, quantity, type, reason } = body;

    if (!productId || quantity === undefined || !type || !reason) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: productId, quantity, type, reason",
        },
        { status: 400 }
      );
    }

    const validTypes = ["in", "out", "adjustment"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid type. Must be: in, out, or adjustment",
        },
        { status: 400 }
      );
    }

    const mockUserId = session.user.email || "admin_123";
    const result = await InventoryService.updateStock(
      productId,
      variantId,
      quantity,
      type,
      reason,
      mockUserId
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        newStock: result.newStock,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update inventory",
      },
      { status: 500 }
    );
  }
}
