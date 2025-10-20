import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { z } from "zod";
import { error as logError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().min(1).max(100),
  content: z.string().min(10).max(1000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    // Get reviews from database
    const reviews = await prisma.productReview.findMany({
      where: {
        productId,
        isPublished: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const formattedReviews = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title || "",
      content: review.content,
      verified: review.isVerified,
      helpful: review.helpfulVotes,
      createdAt: review.createdAt.toISOString(),
      user: {
        id: review.userId || "anonymous",
        name: review.authorName,
      },
    }));

    return NextResponse.json({
      reviews: formattedReviews,
      totalCount: formattedReviews.length,
      hasMore: reviews.length === 20,
    });
  } catch (error) {
    logError("Error fetching reviews", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptionsEnhanced);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid review data", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { rating, title, content } = validation.data;
    const productId = params.id;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.productReview.findFirst({
      where: {
        productId,
        userId,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this product" },
        { status: 400 }
      );
    }

    // Get user name for the review
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Create review
    const review = await prisma.productReview.create({
      data: {
        productId,
        userId,
        authorName: user?.name || "Anonymous",
        authorEmail: user?.email,
        rating,
        title,
        content,
        isPublished: true,
      },
    });

    return NextResponse.json({
      success: true,
      reviewId: review.id,
      review: {
        id: review.id,
        rating: review.rating,
        title: review.title || "",
        content: review.content,
        verified: review.isVerified,
        helpful: review.helpfulVotes,
        createdAt: review.createdAt.toISOString(),
        user: {
          id: userId,
          name: review.authorName,
        },
      },
    });
  } catch (error) {
    logError("Error creating review", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}
