import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { ReviewService } from "@/lib/server/reviewService";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = session?.user?.id;
  if (!uid) return null;
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.isAdmin) return null;
  return user;
}

/**
 * GET /api/admin/reviews/moderation-queue
 * Get reviews pending moderation
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const queue = await ReviewService.getModerationQueue(limit);

    return NextResponse.json({ queue });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch moderation queue" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/reviews/moderation-queue
 * Moderate a review (approve/reject/delete)
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { reviewId, action, reason, note } = body;

    if (!reviewId || !action) {
      return NextResponse.json(
        { error: "reviewId and action are required" },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case "approve":
        result = await ReviewService.approveReview(
          reviewId,
          admin.id,
          note || reason
        );
        break;
      case "reject":
        result = await ReviewService.rejectReview(
          reviewId,
          admin.id,
          note || reason
        );
        break;
      case "delete":
        result = await ReviewService.deleteReview(reviewId, admin.id);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action. Use: approve, reject, or delete" },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to perform moderation action" },
      { status: 500 }
    );
  }
}
