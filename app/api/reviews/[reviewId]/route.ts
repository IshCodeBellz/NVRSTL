import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { ReviewService } from "@/lib/server/reviewService";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const session = await getServerSession(authOptionsEnhanced);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    const mockUserId = session.user.email || "user_123";

    if (action === "helpful") {
      const result = await ReviewService.voteReviewHelpful(
        params.reviewId,
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
          newVoteCount: result.newVoteCount,
        },
      });
    }

    if (action === "report") {
      const { reason } = body;

      if (!reason) {
        return NextResponse.json(
          {
            success: false,
            error: "Report reason required",
          },
          { status: 400 }
        );
      }

      const result = await ReviewService.reportReview(
        params.reviewId,
        mockUserId,
        reason
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
        message: "Review reported successfully",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid action",
      },
      { status: 400 }
    );
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Review action API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process review action",
      },
      { status: 500 }
    );
  }
}
