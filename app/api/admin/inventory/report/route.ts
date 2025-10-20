import { NextResponse } from "next/server";
import { InventoryService } from "@/lib/server/inventoryService";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";

export const dynamic = "force-dynamic";

export async function GET() {
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

    const report = await InventoryService.generateInventoryReport();

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate inventory report",
      },
      { status: 500 }
    );
  }
}
