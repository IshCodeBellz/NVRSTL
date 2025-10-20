import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { isOrderStatus, type OrderStatus } from "@/lib/status";
import { OrderStatusService } from "@/lib/server/orderStatusService";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Test harness bypass (mirrors pattern used in checkout & payment intent endpoints)
  let session = await getServerSession(authOptionsEnhanced);
  const testUser =
    process.env.NODE_ENV === "test" ? req.headers.get("x-test-user") : null;
  if (testUser) {
    session = {
      user: {
        id: testUser,
        email: "test@example.com",
        isAdmin: true,
        emailVerified: true,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }
  if (!session?.user?.isAdmin)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Accept both traditional form submission (existing admin UI) and JSON (tests)
  const contentType = req.headers.get("content-type") || "";
  let status: string | null = null;
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    if (body && typeof body.status === "string") status = body.status;
  } else {
    const form = await req.formData().catch(() => null);
    const raw = form?.get("status");
    if (typeof raw === "string") status = raw;
  }

  if (typeof status !== "string" || !isOrderStatus(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  // Use enhanced order status service with full validation
  const result = await OrderStatusService.transitionOrderStatus(
    params.id,
    status as OrderStatus,
    {
      adminUserId: session.user.id,
      reason: "Admin status change",
      forceTransition: true, // Admin can force transitions
    }
  );

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error || "transition_failed",
        validTransitions: result.validTransitions,
      },
      { status: 400 }
    );
  }

  return NextResponse.redirect(new URL("/admin/orders", req.url));
}
