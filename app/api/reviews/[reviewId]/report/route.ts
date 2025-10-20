import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { ReviewService } from "@/lib/server/reviewService";
import { z } from "zod";

export const dynamic = "force-dynamic";

const reportSchema = z.object({
  reason: z.enum([
    "spam",
    "inappropriate",
    "offensive",
    "fake",
    "irrelevant",
    "other",
  ]),
});

/**
 * POST /api/reviews/[reviewId]/report
 * Report a review for moderation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reason } = reportSchema.parse(body);

    const result = await ReviewService.reportReview(
      params.reviewId,
      session.user.id,
      reason
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message ?? "Report received",
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Report review error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid report data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to report review" },
      { status: 500 }
    );
  }
}
