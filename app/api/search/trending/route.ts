import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";

export async function GET() {
  try {
    // Mock trending searches - will be replaced with real data once analytics are configured
    const mockTrending = [
      { query: "summer dresses", count: 1250 },
      { query: "sneakers", count: 980 },
      { query: "jeans", count: 847 },
      { query: "t-shirts", count: 765 },
      { query: "accessories", count: 623 },
      { query: "jackets", count: 542 },
      { query: "bags", count: 489 },
      { query: "shoes", count: 456 },
    ];

    return NextResponse.json({ trending: mockTrending });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Error fetching trending searches:", error);
    return NextResponse.json({ trending: [] });
  }
}
