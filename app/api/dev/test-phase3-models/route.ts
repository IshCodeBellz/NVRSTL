import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    // Test if we can access our new Phase 3 models
    logger.info("Testing Prisma client with Phase 3 models...");

    // Test ProductVariant model
    const variantCount = await prisma.productVariant.count();
    logger.info("ProductVariant count:", { count: variantCount });

    // Test UserBehavior model
    const behaviorCount = await prisma.userBehavior.count();
    logger.info("UserBehavior count:", { count: behaviorCount });

    // Test ProductBundle model
    const bundleCount = await prisma.productBundle.count();
    logger.info("ProductBundle count:", { count: bundleCount });

    // Test InventoryAlert model
    const alertCount = await prisma.inventoryAlert.count();
    logger.info("InventoryAlert count:", { count: alertCount });

    return NextResponse.json({
      success: true,
      data: {
        message: "Phase 3 models are working!",
        counts: {
          variants: variantCount,
          behaviors: behaviorCount,
          bundles: bundleCount,
          alerts: alertCount,
        },
      },
    });
  } catch (error) {
    logger.error("Error:", error);
    logger.error("Phase 3 model test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Phase 3 models not accessible",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
