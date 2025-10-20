import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { ReviewService } from "@/lib/server/reviewService";

export const dynamic = "force-dynamic";

/**
 * POST /api/reviews/[reviewId]/vote
 * Vote on a review as helpful
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

    const result = await ReviewService.voteReviewHelpful(
      params.reviewId,
      session.user.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      newVoteCount: result.newVoteCount,
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Vote review error:", error);
    return NextResponse.json(
      { error: "Failed to record vote" },
      { status: 500 }
    );
  }
}
