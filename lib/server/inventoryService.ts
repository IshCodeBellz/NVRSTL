import { prisma } from "./prisma";

export interface InventoryItem {
  productId: string;
  variantId: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  size?: string;
  color?: string;
  sku?: string;
  lowStockThreshold: number;
  isLowStock: boolean;
  lastUpdated: Date;
}

export class InventoryService {
  // Get inventory for a specific product
  static async getInventoryForProduct(
    productId: string
  ): Promise<InventoryItem[]> {
    try {
      const variants = await prisma.productVariant.findMany({
        where: { productId },
        include: {
          product: true,
        },
      });

      return variants.map((variant) => ({
        productId,
        variantId: variant.id,
        currentStock: variant.stock,
        reservedStock: 0, // TODO: Calculate reserved stock from pending orders
        availableStock: variant.stock,
        size: variant.type === "size" ? variant.value : undefined,
        color: variant.type === "color" ? variant.value : undefined,
        sku: variant.sku,
        lowStockThreshold: 10, // Default threshold
        isLowStock: variant.stock <= 10,
        lastUpdated: variant.updatedAt,
      }));
    } catch (error) {
      console.error("Error:", error);
      console.error("Get product inventory error:", error);
      return [];
    }
  }

  /**
   * Update stock levels
   */
  static async updateStock(
    productId: string,
    variantId: string,
    quantity: number,
    type: "in" | "out" | "set",
    reason: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string; newStock?: number }> {
    try {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant) {
        return { success: false, error: "Variant not found" };
      }

      let newStock = variant.stock;
      switch (type) {
        case "in":
          newStock += quantity;
          break;
        case "out":
          newStock = Math.max(0, newStock - quantity);
          break;
        case "set":
          newStock = quantity;
          break;
      }

      await prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock },
      });

      console.log("Stock updated:", {
        productId,
        variantId,
        oldStock: variant.stock,
        newStock,
        type,
        reason,
      });

      return { success: true, newStock };
    } catch (error) {
      console.error("Error:", error);
      console.error("Update stock error:", error);
      return { success: false, error: "Failed to update stock" };
    }
  }

  // Check if product is in stock
  static async checkStock(
    productId: string,
    variantId: string
  ): Promise<boolean> {
    try {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { stock: true },
      });

      return variant ? variant.stock > 0 : false;
    } catch (error) {
      console.error("Error checking stock:", error);
      return false;
    }
  }

  // Get low stock items
  static async getLowStockItems(
    threshold: number = 10
  ): Promise<InventoryItem[]> {
    try {
      const variants = await prisma.productVariant.findMany({
        where: {
          stock: { lte: threshold },
        },
        include: {
          product: true,
        },
        take: 100,
      });

      return variants.map((variant) => ({
        productId: variant.productId,
        variantId: variant.id,
        currentStock: variant.stock,
        reservedStock: 0,
        availableStock: variant.stock,
        size: variant.type === "size" ? variant.value : undefined,
        color: variant.type === "color" ? variant.value : undefined,
        sku: variant.sku,
        lowStockThreshold: threshold,
        isLowStock: true,
        lastUpdated: variant.updatedAt,
      }));
    } catch (error) {
      console.error("Error getting low stock items:", error);
      return [];
    }
  }

  // Compatibility wrappers for demo route
  static async getProductInventory(productId: string) {
    return this.getInventoryForProduct(productId);
  }

  static async getLowStockAlerts(limit = 10) {
    // Map low stock items to a basic alert shape
    const items = await this.getLowStockItems(10);
    return items.slice(0, limit).map((v) => ({
      productId: v.productId,
      variantId: v.variantId,
      type: v.currentStock === 0 ? "out_of_stock" : "low_stock",
      isActive: true,
    }));
  }

  static async reserveStock(
    _items: Array<{ productId: string; variantId: string; quantity: number }>,
    _orderId: string
  ) {
    // Placeholder reservation implementation
    return {
      success: true,
      reservationId: `rsrv_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  static async generateInventoryReport() {
    // Minimal report based on variants
    const [totalProducts, variants, lowStock, outOfStock] = await Promise.all([
      prisma.product.count(),
      prisma.productVariant.findMany({ include: { product: true } }),
      prisma.productVariant.count({ where: { stock: { gt: 0, lte: 10 } } }),
      prisma.productVariant.count({ where: { stock: 0 } }),
    ]);

    const totalValue = variants.reduce((sum, v) => {
      const price = v.priceCents || v.product?.priceCents || 0;
      return sum + price * v.stock;
    }, 0);

    return {
      totalProducts,
      totalVariants: variants.length,
      lowStockItems: lowStock,
      outOfStockItems: outOfStock,
      totalValue,
    };
  }

  // ----- Instance methods consumed by admin UI -----
  // Provide instance wrappers to match admin page usage pattern

  // Stock alert type the admin UI expects
  async getStockAlerts(limit = 20): Promise<
    Array<{
      productName: string;
      sku?: string | null;
      variant: string;
      currentStock: number;
      alertLevel: "critical" | "warning" | "low";
      daysLeft?: number | null;
    }>
  > {
    try {
      const threshold = 10;
      const variants = await prisma.productVariant.findMany({
        where: { stock: { lte: threshold } },
        include: { product: { select: { name: true } } },
        orderBy: { stock: "asc" },
        take: limit,
      });

      return variants.map((v) => {
        const variantLabel =
          v.type && v.value ? `${v.type}: ${v.value}` : "Variant";
        const stock = v.stock;
        const alertLevel: "critical" | "warning" | "low" =
          stock === 0 ? "critical" : stock <= 5 ? "warning" : "low";
        return {
          productName: v.product?.name ?? v.productId,
          sku: v.sku,
          variant: variantLabel,
          currentStock: stock,
          alertLevel,
          daysLeft: null,
        };
      });
    } catch (error) {
      console.error("Get stock alerts error:", error);
      return [];
    }
  }

  async getRecentStockMovements(_limit = 20): Promise<
    Array<{
      createdAt: string;
      productName: string;
      variant: string;
      type: "incoming" | "outgoing" | "adjustment";
      quantity: number;
      reference: string;
      newStock: number;
    }>
  > {
    // No movements table yet; return an empty list
    return [];
  }

  async getLowStockProducts(limit = 10): Promise<
    Array<{
      productName: string;
      sku?: string | null;
      variant: string;
      stock: number;
      threshold: number;
    }>
  > {
    try {
      const threshold = 10;
      const variants = await prisma.productVariant.findMany({
        where: { stock: { lte: threshold } },
        include: { product: { select: { name: true } } },
        orderBy: { stock: "asc" },
        take: limit,
      });

      return variants.map((v) => ({
        productName: v.product?.name ?? v.productId,
        sku: v.sku,
        variant: v.type && v.value ? `${v.type}: ${v.value}` : "Variant",
        stock: v.stock,
        threshold,
      }));
    } catch (error) {
      console.error("Get low stock products error:", error);
      return [];
    }
  }

  async getInventoryStats(): Promise<{
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValue: number;
  }> {
    const report = await InventoryService.generateInventoryReport();
    return {
      totalProducts: report.totalProducts,
      lowStockCount: report.lowStockItems,
      outOfStockCount: report.outOfStockItems,
      totalValue: report.totalValue,
    };
  }
}
