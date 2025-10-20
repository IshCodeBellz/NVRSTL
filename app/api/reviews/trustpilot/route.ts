import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

interface TrustpilotReview {
  id: string;
  consumer: {
    displayName: string;
    imageUrl?: string;
  };
  stars: number;
  title?: string;
  text: string;
  createdAt: string;
  isVerified: boolean;
}

interface TrustpilotResponse {
  reviews: TrustpilotReview[];
  links?: {
    total?: number;
  };
}

// Mock implementation - replace with actual Trustpilot API integration
const mockTrustpilotData: TrustpilotResponse = {
  reviews: [
    {
      id: "tp_1",
      consumer: {
        displayName: "Sarah J.",
        imageUrl: "https://i.pravatar.cc/150?u=sarah1",
      },
      stars: 5,
      title: "Amazing quality and service!",
      text: "I absolutely love shopping here! The quality of the clothes is exceptional and the delivery was incredibly fast. The customer service team was so helpful when I had questions about sizing. Will definitely be ordering again soon!",
      createdAt: "2024-10-10T10:30:00Z",
      isVerified: true,
    },
    {
      id: "tp_2",
      consumer: {
        displayName: "Michael C.",
        imageUrl: "https://i.pravatar.cc/150?u=michael1",
      },
      stars: 5,
      title: "Best online fashion store",
      text: "This is hands down the best online fashion retailer I've used. Great selection of brands, competitive prices, and the return process was seamless when I needed to exchange a jacket for a different size.",
      createdAt: "2024-10-08T14:15:00Z",
      isVerified: true,
    },
    {
      id: "tp_3",
      consumer: {
        displayName: "Emma W.",
        imageUrl: "https://i.pravatar.cc/150?u=emma1",
      },
      stars: 4,
      title: "Great products, minor shipping delay",
      text: "Love the quality and style of the clothes I ordered. Only small issue was a slight delay in shipping, but customer service kept me updated throughout. The items were exactly as described and fit perfectly!",
      createdAt: "2024-10-06T09:45:00Z",
      isVerified: true,
    },
    {
      id: "tp_4",
      consumer: {
        displayName: "James R.",
        imageUrl: "https://i.pravatar.cc/150?u=james1",
      },
      stars: 5,
      title: "Excellent shopping experience",
      text: "From browsing to checkout to delivery, everything was smooth and professional. The website is easy to use, prices are fair, and the quality exceeded my expectations. Highly recommend!",
      createdAt: "2024-10-04T16:20:00Z",
      isVerified: true,
    },
    {
      id: "tp_5",
      consumer: {
        displayName: "Lisa M.",
        imageUrl: "https://i.pravatar.cc/150?u=lisa1",
      },
      stars: 5,
      title: "Love everything I ordered!",
      text: "Ordered multiple items and every single piece was perfect. The fabric quality is amazing, colors are vibrant, and everything fits true to size. This is now my go-to online store for fashion!",
      createdAt: "2024-10-02T11:10:00Z",
      isVerified: false,
    },
    {
      id: "tp_6",
      consumer: {
        displayName: "David P.",
        imageUrl: "https://i.pravatar.cc/150?u=david1",
      },
      stars: 4,
      title: "Good selection and quality",
      text: "Great variety of products and styles to choose from. The mobile app works perfectly and makes shopping convenient. Customer support was helpful when I had questions about care instructions.",
      createdAt: "2024-09-30T13:35:00Z",
      isVerified: true,
    },
  ],
};

export async function GET() {
  try {
    // In production, you would fetch from Trustpilot API:
    // const response = await fetch(`https://api.trustpilot.com/v1/business-units/${BUSINESS_UNIT_ID}/reviews`, {
    //   headers: {
    //     'Authorization': `Bearer ${process.env.TRUSTPILOT_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   }
    // });
    //
    // if (!response.ok) {
    //   throw new Error('Failed to fetch Trustpilot reviews');
    // }
    //
    // const data = await response.json();

    // For now, return mock data
    const data = mockTrustpilotData;

    // Transform the data to match our component interface
    const transformedReviews = data.reviews.map((review) => ({
      id: review.id,
      author: review.consumer.displayName,
      rating: review.stars,
      text: review.text,
      title: review.title,
      date: review.createdAt,
      avatar: review.consumer.imageUrl,
      platform: "trustpilot" as const,
      verified: review.isVerified,
    }));

    return NextResponse.json({
      success: true,
      reviews: transformedReviews,
      platform: "trustpilot",
      stats: {
        averageRating: 4.8,
        totalReviews: data.reviews.length,
        verifiedPercentage: 85,
      },
    });
  } catch (error) {
    logger.error("Error fetching Trustpilot reviews:", error);
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
