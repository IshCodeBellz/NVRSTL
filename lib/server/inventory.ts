import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";

// Inventory utilities to centralize concurrency-safe stock mutations.
// For SQLite we keep the existing conditional UPDATE strategy.
// For Postgres we use a RETURNING clause (future ready; still safe in SQLite path).

export async function decrementSizeStock(
  tx:
    | PrismaClient
    | Omit<
        PrismaClient,
        | "$connect"
        | "$disconnect"
        | "$on"
        | "$transaction"
        | "$use"
        | "$extends"
      >,
  sizeVariantId: string,
  qty: number
): Promise<boolean> {
  if (qty <= 0) return true; // nothing to decrement
  const dbUrl = process.env.DATABASE_URL || "";
  const isPostgres =
    dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
  if (isPostgres) {
    // Postgres dialect (RETURNING) — use $executeRawUnsafe, which returns number of rows affected.
    // Using any here is necessary due to Prisma transaction typing limitations with raw SQL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const affected = await (tx as any).$executeRawUnsafe(
      `UPDATE "SizeVariant" SET "stock" = "stock" - $1 WHERE "id" = $2 AND "stock" >= $1`,
      qty,
      sizeVariantId
    );
    return !!affected;
  }
  // SQLite path — use positional parameters.
  // Using any here is necessary due to Prisma transaction typing limitations with raw SQL
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const affected = await (tx as any).$executeRawUnsafe(
    `UPDATE SizeVariant SET stock = stock - ? WHERE id = ? AND stock >= ?`,
    qty,
    sizeVariantId,
    qty
  );
  return !!affected;
}

/**
 * Restore stock for size variants (used when payment fails or order is cancelled)
 */
export async function restoreStock(
  orderId: string,
  reason: "PAYMENT_FAILED" | "ORDER_CANCELLED" = "PAYMENT_FAILED"
): Promise<{ success: boolean; restoredItems: number; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get all order items for this order
      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
      });

      let restoredCount = 0;

      for (const item of orderItems) {
        if (item.size) {
          // Get the product and find the size variant
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            include: { sizeVariants: true },
          });

          if (product) {
            const sizeVariant = product.sizeVariants.find(
              (sv) => sv.label === item.size
            );

            if (sizeVariant) {
              // Restore stock
              const success = await restoreSizeStock(
                tx,
                sizeVariant.id,
                item.qty
              );
              if (success) {
                restoredCount++;
              }
            }
          }
        }
      }

      // Log the stock restoration
      await tx.orderEvent.create({
        data: {
          orderId,
          kind: "STOCK_RESTORED",
          message: `Stock restored: ${reason.toLowerCase().replace("_", " ")}`,
          meta: JSON.stringify({
            reason,
            restoredItems: restoredCount,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return restoredCount;
    });

    return {
      success: true,
      restoredItems: result,
    };
  } catch (error) {
    console.error("Stock restoration failed:", error);
    return {
      success: false,
      restoredItems: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Restore stock for a specific size variant
 */
export async function restoreSizeStock(
  tx:
    | PrismaClient
    | Omit<
        PrismaClient,
        | "$connect"
        | "$disconnect"
        | "$on"
        | "$transaction"
        | "$use"
        | "$extends"
      >,
  sizeVariantId: string,
  qty: number
): Promise<boolean> {
  if (qty <= 0) return true; // nothing to restore

  const dbUrl = process.env.DATABASE_URL || "";
  const isPostgres =
    dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

  if (isPostgres) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const affected = await (tx as any).$executeRawUnsafe(
      `UPDATE "SizeVariant" SET "stock" = "stock" + $1 WHERE "id" = $2`,
      qty,
      sizeVariantId
    );
    return !!affected;
  }

  // SQLite path
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const affected = await (tx as any).$executeRawUnsafe(
    `UPDATE SizeVariant SET stock = stock + ? WHERE id = ?`,
    qty,
    sizeVariantId
  );
  return !!affected;
}
