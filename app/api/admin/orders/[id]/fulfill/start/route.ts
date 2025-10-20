import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { FulfillmentService } from "@/lib/server/shipping/FulfillmentService";
import { broadcast } from "@/lib/server/events/adminEvents";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptionsEnhanced);
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderId = params.id;
  try {
    await FulfillmentService.processOrderForFulfillment(orderId);
    // Notify listeners that an order moved out of PAID
    broadcast("order-status", { orderId, status: "FULFILLING" });
    return NextResponse.json({ success: true });
    /* eslint-disable-next-line */
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to start fulfillment" },
      { status: 400 }
    );
  }
}
