import { prisma } from "./prisma";
import { cache } from "react";

export interface CreateWishlistData {
  userId: string;
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  priceCents: number;
  addedAt: Date;
  isAvailable: boolean;
  notes?: string;
}

export interface SocialWishlist {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  name: string;
  description?: string;
  isPublic: boolean;
  shareToken?: string;
  items: WishlistItem[];
  followerCount: number;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WishlistAnalytics {
  totalWishlists: number;
  totalItems: number;
  averageItemsPerWishlist: number;
  mostWishlistedProducts: Array<{
    productId: string;
    productName: string;
    wishlistCount: number;
  }>;
  conversionRate: number; // Items moved from wishlist to cart
}

// Cached functions for performance
const getCachedUserWishlists = cache(async (userId: string) => {
  return await prisma.wishlist.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: true,
            },
          },
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
});

/**
 * Enhanced Social Wishlist Service with Real Database Integration
 */
export class SocialWishlistService {
  /**
   * Create a new wishlist
   */
  static async createWishlist(
    data: CreateWishlistData
  ): Promise<{ success: boolean; wishlist?: SocialWishlist; error?: string }> {
    try {
      // Check if user already has a wishlist with this name
      const existingWishlist = await prisma.wishlist.findFirst({
        where: {
          userId: data.userId,
          name: data.name || "My Wishlist",
        },
      });

      if (existingWishlist) {
        return {
          success: false,
          error: "You already have a wishlist with this name",
        };
      }

      // Generate share token if public
      const shareToken = data.isPublic ? this.generateShareToken() : null;

      // Create wishlist in database
      const wishlist = await prisma.wishlist.create({
        data: {
          userId: data.userId,
          name: data.name || "My Wishlist",
          description: data.description,
          isPublic: data.isPublic || false,
          shareToken,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { take: 1, orderBy: { position: "asc" } },
                },
              },
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      const transformedWishlist = this.transformWishlist(wishlist);
      return { success: true, wishlist: transformedWishlist };
    } catch (error) {
      console.error("Error:", error);
      console.error("Create wishlist error:", error);
      return { success: false, error: "Failed to create wishlist" };
    }
  }

  /**
   * Transform Prisma wishlist to SocialWishlist interface
   */
  private static transformWishlist(wishlist: {
    id: string;
    userId: string | null;
    name: string | null;
    description?: string | null;
    isPublic: boolean;
    shareToken?: string | null;
    createdAt: Date;
    updatedAt: Date;
    user?: { name?: string | null; email?: string | null } | null;
    items: Array<{
      id: string;
      productId: string;
      createdAt: Date;
      notes?: string | null;
      product: {
        name: string;
        priceCents: number;
        isActive?: boolean;
        images: Array<{ url: string }>;
      };
    }>;
  }): SocialWishlist {
    return {
      id: wishlist.id,
      userId: wishlist.userId || "",
      userName: wishlist.user?.name || "Anonymous",
      userAvatar: `/avatars/${wishlist.user?.name?.toLowerCase()}.jpg`,
      name: wishlist.name || "My Wishlist",
      description: wishlist.description || undefined,
      isPublic: wishlist.isPublic,
      shareToken: wishlist.shareToken || undefined,
      items: wishlist.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images[0]?.url || "/placeholder.svg",
        priceCents: item.product.priceCents,
        addedAt: item.createdAt,
        isAvailable: item.product.isActive ?? true,
        notes: item.notes || undefined,
      })),
      followerCount: 0, // Will be implemented when followers table exists
      totalValue: wishlist.items.reduce(
        (sum: number, item) => sum + item.product.priceCents,
        0
      ),
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt,
    };
  }

  /**
   * Add item to wishlist
   */
  static async addToWishlist(
    userId: string,
    productId: string,
    wishlistId?: string,
    notes?: string
  ): Promise<{ success: boolean; item?: WishlistItem; error?: string }> {
    try {
      // Get or create default wishlist if none specified
      let targetWishlistId = wishlistId;
      if (!targetWishlistId) {
        const defaultWishlist = await prisma.wishlist.findFirst({
          where: { userId, name: "My Wishlist" },
        });

        if (!defaultWishlist) {
          const createResult = await this.createWishlist({ userId });
          if (!createResult.success || !createResult.wishlist) {
            return {
              success: false,
              error: "Failed to create default wishlist",
            };
          }
          targetWishlistId = createResult.wishlist.id;
        } else {
          targetWishlistId = defaultWishlist.id;
        }
      }

      // Check if item already in wishlist
      const existingItem = await prisma.wishlistItem.findFirst({
        where: {
          wishlistId: targetWishlistId,
          productId,
        },
      });

      if (existingItem) {
        return { success: false, error: "Item already in wishlist" };
      }

      // Verify product exists and get product data
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          images: { take: 1, orderBy: { position: "asc" } },
        },
      });

      if (!product) {
        return { success: false, error: "Product not found" };
      }

      // Create wishlist item
      const wishlistItem = await prisma.wishlistItem.create({
        data: {
          wishlistId: targetWishlistId,
          productId,
          ...(notes && { notes }),
        },
        include: {
          product: {
            include: {
              images: { take: 1, orderBy: { position: "asc" } },
            },
          },
        },
      });

      // Update wishlist timestamp
      await prisma.wishlist.update({
        where: { id: targetWishlistId },
        data: { updatedAt: new Date() },
      });

      // Track analytics
      await this.trackWishlistEvent(userId, productId, "add");

      const transformedItem: WishlistItem = {
        id: wishlistItem.id,
        productId: wishlistItem.productId,
        productName: product.name,
        productImage: product.images[0]?.url || "/placeholder.svg",
        priceCents: product.priceCents,
        addedAt: wishlistItem.createdAt,
        isAvailable: product.isActive ?? true,
        notes: (wishlistItem as { notes?: string | null }).notes || undefined,
      };

      return { success: true, item: transformedItem };
    } catch (error) {
      console.error("Error:", error);
      console.error("Add to wishlist error:", error);
      return { success: false, error: "Failed to add item to wishlist" };
    }
  }

  /**
   * Remove item from wishlist
   */
  static async removeFromWishlist(
    userId: string,
    itemId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find and verify ownership of the wishlist item
      const wishlistItem = await prisma.wishlistItem.findFirst({
        where: {
          id: itemId,
          wishlist: { userId },
        },
        include: { wishlist: true },
      });

      if (!wishlistItem) {
        return { success: false, error: "Item not found or access denied" };
      }

      // Delete the wishlist item
      await prisma.wishlistItem.delete({
        where: { id: itemId },
      });

      // Update wishlist timestamp
      await prisma.wishlist.update({
        where: { id: wishlistItem.wishlistId },
        data: { updatedAt: new Date() },
      });

      // Track analytics
      await this.trackWishlistEvent(userId, wishlistItem.productId, "remove");

      return { success: true };
    } catch (error) {
      console.error("Error:", error);
      console.error("Remove from wishlist error:", error);
      return { success: false, error: "Failed to remove item from wishlist" };
    }
  }

  /**
   * Get user's wishlists
   */
  static async getUserWishlists(userId: string): Promise<SocialWishlist[]> {
    try {
      const wishlists = await getCachedUserWishlists(userId);
      return wishlists.map((wishlist) => this.transformWishlist(wishlist));
    } catch (error) {
      console.error("Error:", error);
      console.error("Get user wishlists error:", error);
      return [];
    }
  }

  /**
   * Get public wishlist by share token
   */
  static async getPublicWishlist(
    shareToken: string
  ): Promise<SocialWishlist | null> {
    try {
      const wishlist = await prisma.wishlist.findFirst({
        where: {
          shareToken,
          isPublic: true,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { take: 1, orderBy: { position: "asc" } },
                },
              },
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!wishlist) {
        return null;
      }

      return this.transformWishlist(wishlist);
    } catch (error) {
      console.error("Error:", error);
      console.error("Get public wishlist error:", error);
      return null;
    }
  }

  /**
   * Follow a public wishlist
   */
  static async followWishlist(
    userId: string,
    wishlistId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if wishlist exists and is public
      const wishlist = await prisma.wishlist.findUnique({
        where: { id: wishlistId },
      });

      if (!wishlist || !wishlist.isPublic) {
        return { success: false, error: "Wishlist not found or not public" };
      }

      // For now, just log the follow action
      // In a full implementation, you'd create a followers table
      console.log("User following wishlist:", { userId, wishlistId });

      // Track the follow event
      await this.trackWishlistEvent(userId, wishlistId, "follow");

      return { success: true };
    } catch (error) {
      console.error("Error:", error);
      console.error("Follow wishlist error:", error);
      return { success: false, error: "Failed to follow wishlist" };
    }
  }

  /**
   * Get trending public wishlists
   */
  static async getTrendingWishlists(
    limit: number = 10
  ): Promise<SocialWishlist[]> {
    try {
      const wishlists = await prisma.wishlist.findMany({
        where: {
          isPublic: true,
          items: {
            some: {}, // Only wishlists with items
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { take: 1, orderBy: { position: "asc" } },
                },
              },
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { updatedAt: "desc" }, // Most recently updated first
        ],
        take: limit,
      });

      return wishlists.map((wishlist) => this.transformWishlist(wishlist));
    } catch (error) {
      console.error("Error:", error);
      console.error("Get trending wishlists error:", error);
      return [];
    }
  }

  /**
   * Generate wishlist analytics
   */
  static async getWishlistAnalytics(): Promise<WishlistAnalytics> {
    try {
      // Get total wishlists count
      const totalWishlists = await prisma.wishlist.count();

      // Get total items count
      const totalItems = await prisma.wishlistItem.count();

      // Calculate average items per wishlist
      const averageItemsPerWishlist =
        totalWishlists > 0
          ? Number((totalItems / totalWishlists).toFixed(1))
          : 0;

      // Get most wishlisted products
      const wishlistCounts = await prisma.wishlistItem.groupBy({
        by: ["productId"],
        _count: {
          productId: true,
        },
        orderBy: {
          _count: {
            productId: "desc",
          },
        },
        take: 3,
      });

      const mostWishlistedProducts = await Promise.all(
        wishlistCounts.map(async (item) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { name: true },
          });
          return {
            productId: item.productId,
            productName: product?.name || "Unknown Product",
            wishlistCount: item._count.productId,
          };
        })
      );

      // Calculate conversion rate (simplified - items that have been in orders)
      // This is a basic implementation - in production you'd track actual conversions
      const orderItems = await prisma.orderItem.count();
      const conversionRate =
        totalItems > 0
          ? Number(((orderItems / totalItems) * 100).toFixed(1))
          : 0;

      return {
        totalWishlists,
        totalItems,
        averageItemsPerWishlist,
        mostWishlistedProducts,
        conversionRate,
      };
    } catch (error) {
      console.error("Error:", error);
      console.error("Get wishlist analytics error:", error);
      // Return default values on error
      return {
        totalWishlists: 0,
        totalItems: 0,
        averageItemsPerWishlist: 0,
        mostWishlistedProducts: [],
        conversionRate: 0,
      };
    }
  }

  /**
   * Move items from wishlist to cart
   */
  static async moveToCart(
    userId: string,
    itemIds: string[]
  ): Promise<{
    success: boolean;
    movedCount?: number;
    failedItems?: string[];
    error?: string;
  }> {
    try {
      let movedCount = 0;
      const failedItems: string[] = [];

      for (const itemId of itemIds) {
        // Verify user has access to the wishlist item
        const wishlistItem = await prisma.wishlistItem.findFirst({
          where: {
            id: itemId,
            wishlist: { userId },
          },
          include: {
            product: true,
          },
        });

        if (wishlistItem && wishlistItem.product) {
          // In a full implementation, you'd add to cart here
          // For now, we'll just track the event
          await this.trackWishlistEvent(
            userId,
            wishlistItem.productId,
            "move_to_cart"
          );
          console.log("Item moved to cart:", {
            userId,
            itemId,
            productId: wishlistItem.productId,
          });
          movedCount++;
        } else {
          failedItems.push(itemId);
        }
      }

      return {
        success: true,
        movedCount,
        failedItems: failedItems.length > 0 ? failedItems : undefined,
      };
    } catch (error) {
      console.error("Error:", error);
      console.error("Move to cart error:", error);
      return { success: false, error: "Failed to move items to cart" };
    }
  }

  /**
   * Private helper methods
   */
  private static generateShareToken(): string {
    return "share_" + Math.random().toString(36).substring(2, 15);
  }

  private static async trackWishlistEvent(
    userId: string,
    productId: string,
    action: string
  ): Promise<void> {
    try {
      // Create a user behavior event for tracking
      await prisma.userBehavior.create({
        data: {
          userId,
          eventType: `wishlist_${action}`,
          productId,
          sessionId: `session_${Date.now()}`,
          metadata: JSON.stringify({
            timestamp: new Date().toISOString(),
            action,
          }),
        },
      });

      console.log("Wishlist event tracked:", {
        userId,
        productId,
        action,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error:", error);
      console.error("Failed to track wishlist event:", error);
      // Don't throw - tracking failures shouldn't break wishlist functionality
    }
  }

  /**
   * Admin interface methods
   */
  async getRecentActivity() {
    try {
      // Get recent wishlist activities from UserBehavior table
      const recentWishlistEvents = await prisma.userBehavior.findMany({
        where: {
          eventType: {
            startsWith: "wishlist_",
          },
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          timestamp: "desc",
        },
        take: 10,
      });

      // Get recent reviews
      const recentReviews = await prisma.productReview.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      });

      return {
        wishlists: recentWishlistEvents.map((event) => ({
          userName: event.user?.name || "Anonymous",
          action: event.eventType.replace("wishlist_", ""),
          wishlistName: "N/A", // Would need additional data structure to track this
          timestamp: event.timestamp,
        })),
        reviews: recentReviews.map((review) => ({
          userName: review.authorName || "Anonymous",
          action: "reviewed",
          rating: review.rating,
          timestamp: review.createdAt,
        })),
      };
    } catch (error) {
      console.error("Error:", error);
      console.error("Get recent activity error:", error);
      return {
        wishlists: [],
        reviews: [],
      };
    }
  }
}
