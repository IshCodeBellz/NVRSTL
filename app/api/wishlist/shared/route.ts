import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { SocialWishlistService } from "@/lib/server/socialWishlistService";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createWishlistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptionsEnhanced);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user's wishlists using real database
    const wishlists = await SocialWishlistService.getUserWishlists(userId);

    // Transform to expected format
    const formattedWishlists = wishlists.map((wishlist) => ({
      id: wishlist.id,
      name: wishlist.name,
      description: wishlist.description,
      isPublic: wishlist.isPublic,
      shareCode: wishlist.shareToken,
      createdAt: wishlist.createdAt.toISOString(),
      itemCount: wishlist.items.length,
      owner: {
        id: wishlist.userId,
        name: wishlist.userName,
      },
    }));

    return NextResponse.json({ wishlists: formattedWishlists });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Error fetching shared wishlists:", error);
    return NextResponse.json(
      { error: "Failed to fetch wishlists" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const validation = createWishlistSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid wishlist data", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, description, isPublic } = validation.data;

    // Create wishlist using real database
    const result = await SocialWishlistService.createWishlist({
      userId,
      name,
      description,
      isPublic,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create wishlist" },
        { status: 400 }
      );
    }

    // Transform to expected format
    const formattedWishlist = {
      id: result.wishlist!.id,
      name: result.wishlist!.name,
      description: result.wishlist!.description,
      isPublic: result.wishlist!.isPublic,
      shareCode: result.wishlist!.shareToken,
      createdAt: result.wishlist!.createdAt.toISOString(),
      itemCount: result.wishlist!.items.length,
      owner: {
        id: result.wishlist!.userId,
        name: result.wishlist!.userName,
      },
    };

    return NextResponse.json({
      success: true,
      wishlist: formattedWishlist,
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Error creating shared wishlist:", error);
    return NextResponse.json(
      { error: "Failed to create wishlist" },
      { status: 500 }
    );
  }
}
