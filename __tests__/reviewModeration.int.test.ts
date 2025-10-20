import { prisma } from "@/lib/server/prisma";
import { ReviewService } from "@/lib/server/reviewService";

/**
 * Integration: report -> appears in moderation queue -> approve -> disappears.
 */
describe("review moderation flow", () => {
  const sku = `T-${Date.now()}`;
  let productId: string;
  let userId: string;
  let reviewId: string;

  beforeAll(async () => {
    // Create a user and a product
    const user = await prisma.user.create({
      data: {
        email: `rm-${Date.now()}@ex.com`,
        passwordHash: "x",
        isAdmin: false,
      },
    });
    userId = user.id;

    const product = await prisma.product.create({
      data: {
        sku,
        name: "Test Tee",
        description: "Test",
        priceCents: 1000,
      },
    });
    productId = product.id;

    // Create a review (published by default)
    const created = await ReviewService.createReview({
      productId,
      userId,
      rating: 5,
      content: "Great!",
    });
    expect(created.success).toBe(true);
    if (!created.review) throw new Error("review not created");
    reviewId = created.review.id;
  });

  it("report -> queue -> approve -> removed from queue", async () => {
    // Report the review
    const reported = await ReviewService.reportReview(
      reviewId,
      userId,
      "abusive"
    );
    expect(reported.success).toBe(true);

    // It should now be in the moderation queue
    const queue1 = await ReviewService.getModerationQueue(100);
    const found = queue1.find((q) => q.id === reviewId);
    expect(found).toBeTruthy();

    // Approve with a note
    const approved = await ReviewService.approveReview(reviewId, userId, "ok");
    expect(approved.success).toBe(true);

    // Should no longer be in the queue
    const queue2 = await ReviewService.getModerationQueue(100);
    const found2 = queue2.find((q) => q.id === reviewId);
    expect(found2).toBeFalsy();

    // Basic analytics check: reviewAnalytics row exists
    const ra = await prisma.reviewAnalytics.findUnique({
      where: { productId },
    });
    expect(ra).toBeTruthy();
  });
});
