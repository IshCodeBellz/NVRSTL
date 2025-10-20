import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../../lib/server/logger";
import { sendDailyOrderShippingReport } from "@/lib/server/reports/orderShippingReport";

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    const expected = `Bearer ${process.env.CRON_SECRET || "dev-secret"}`;
    if (auth !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { date?: string };
    const date = body.date ? new Date(body.date) : new Date();

    const { count } = await sendDailyOrderShippingReport(date);
    return NextResponse.json({
      success: true,
      count,
      date: date.toISOString().split("T")[0],
    });
  } catch (error) {
    logger.error("daily-order-shipping cron error:", error);
    return NextResponse.json(
      { error: "Failed to send report" },
      { status: 500 }
    );
  }
}
