import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

interface GoogleReview {
  reviewId: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
    isAnonymous?: boolean;
  };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime: string;
  updateTime?: string;
}

interface GoogleReviewsResponse {
  reviews: GoogleReview[];
  averageRating?: number;
  totalReviewCount?: number;
}

// Mock implementation - replace with actual Google My Business API integration
const mockGoogleData: GoogleReviewsResponse = {
  reviews: [
    {
      reviewId: "g_1",
      reviewer: {
        displayName: "Jennifer L.",
        profilePhotoUrl: "https://i.pravatar.cc/150?u=jennifer1",
        isAnonymous: false,
      },
      starRating: "FIVE",
      comment:
        "Outstanding online shopping experience! The website is user-friendly, checkout was quick, and my order arrived perfectly packaged. The clothes are exactly as shown in the photos and the quality is top-notch.",
      createTime: "2024-10-09T15:30:00Z",
      updateTime: "2024-10-09T15:30:00Z",
    },
    {
      reviewId: "g_2",
      reviewer: {
        displayName: "Robert T.",
        profilePhotoUrl: "https://i.pravatar.cc/150?u=robert1",
        isAnonymous: false,
      },
      starRating: "FIVE",
      comment:
        "Fantastic selection and prices! I've been shopping here for months and have never been disappointed. Fast shipping, easy returns, and customer service is always helpful and responsive.",
      createTime: "2024-10-07T12:45:00Z",
    },
    {
      reviewId: "g_3",
      reviewer: {
        displayName: "Maria S.",
        profilePhotoUrl: "https://i.pravatar.cc/150?u=maria1",
        isAnonymous: false,
      },
      starRating: "FOUR",
      comment:
        "Really impressed with the quality and style of the items I purchased. Delivery was on time and everything was well-packaged. Only minor suggestion would be to add more size guides for some brands.",
      createTime: "2024-10-05T18:20:00Z",
    },
    {
      reviewId: "g_4",
      reviewer: {
        displayName: "Alex K.",
        profilePhotoUrl: "https://i.pravatar.cc/150?u=alex1",
        isAnonymous: false,
      },
      starRating: "FIVE",
      comment:
        "Love this store! Great brands, competitive prices, and excellent customer service. The mobile app makes shopping so convenient. Highly recommend to anyone looking for quality fashion online.",
      createTime: "2024-10-03T08:15:00Z",
    },
    {
      reviewId: "g_5",
      reviewer: {
        displayName: "Sophie B.",
        profilePhotoUrl: "https://i.pravatar.cc/150?u=sophie1",
        isAnonymous: false,
      },
      starRating: "FIVE",
      comment:
        "Been a customer for over a year now and consistently impressed with the service. Orders always arrive quickly and accurately. The return process is straightforward when needed. Definitely my go-to for online fashion shopping!",
      createTime: "2024-10-01T14:50:00Z",
    },
    {
      reviewId: "g_6",
      reviewer: {
        displayName: "Chris M.",
        profilePhotoUrl: "https://i.pravatar.cc/150?u=chris1",
        isAnonymous: false,
      },
      starRating: "FOUR",
      comment:
        "Great selection of products and brands. The search function works well and filtering options make it easy to find what you're looking for. Shipping is reliable and packaging is always secure.",
      createTime: "2024-09-28T19:25:00Z",
    },
  ],
  averageRating: 4.7,
  totalReviewCount: 245,
};

function convertStarRating(rating: string): number {
  const ratingMap: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return ratingMap[rating] || 5;
}

export async function GET() {
  try {
    // In production, you would fetch from Google My Business API:
    // const response = await fetch(`https://mybusiness.googleapis.com/v4/accounts/${ACCOUNT_ID}/locations/${LOCATION_ID}/reviews`, {
    //   headers: {
    //     'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   }
    // });
    //
    // if (!response.ok) {
    //   throw new Error('Failed to fetch Google reviews');
    // }
    //
    // const data = await response.json();

    // For now, return mock data
    const data = mockGoogleData;

    // Transform the data to match our component interface
    const transformedReviews = data.reviews
      .filter((review) => review.comment) // Only include reviews with text
      .map((review) => ({
        id: review.reviewId,
        author: review.reviewer.displayName,
        rating: convertStarRating(review.starRating),
        text: review.comment || "",
        date: review.createTime,
        avatar: review.reviewer.profilePhotoUrl,
        platform: "google" as const,
        verified: !review.reviewer.isAnonymous,
      }));

    return NextResponse.json({
      success: true,
      reviews: transformedReviews,
      platform: "google",
      stats: {
        averageRating: data.averageRating || 4.7,
        totalReviews: data.totalReviewCount || transformedReviews.length,
        verifiedPercentage: 92,
      },
    });
  } catch (error) {
    logger.error("Error fetching Google reviews:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch reviews",
        reviews: [],
      },
      { status: 500 }
    );
  }
}
