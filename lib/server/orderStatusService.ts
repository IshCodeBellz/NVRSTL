import {
  OrderStatus,
  OrderTransitions,
  canTransition,
  isOrderStatus,
} from "@/lib/status";
import { prisma } from "@/lib/server/prisma";
import { OrderEventService } from "./orderEventService";
import { OrderNotificationHandler } from "./notifications/OrderNotificationHandler";
import type { Order } from "@prisma/client";

export interface StatusTransitionAttempt {
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  reason?: string;
  adminUserId?: string;
  timestamp: Date;
}

export interface StatusTransitionResult {
  success: boolean;
  error?: string;
  validTransitions?: OrderStatus[];
  updatedOrder?: Order;
}

export interface StatusTransitionValidation {
  isValid: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
  warnings?: string[];
}

export class OrderStatusService {
  /**
   * Validate a status transition before attempting it
   */
  static validateTransition(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
    order?: Order
  ): StatusTransitionValidation {
    // Check if target status is valid
    if (!isOrderStatus(targetStatus)) {
      return {
        isValid: false,
        reason: `Invalid target status: ${targetStatus}`,
      };
    }

    // Allow idempotent no-op transitions
    if (currentStatus === targetStatus) {
      return {
        isValid: true,
        warnings: ["No status change - order is already in target status"],
      };
    }

    // Check if transition is allowed by the state machine
    if (!canTransition(currentStatus, targetStatus)) {
      const allowedTransitions = OrderTransitions[currentStatus] || [];
      return {
        isValid: false,
        reason: `Invalid transition from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowedTransitions.join(
          ", "
        )}`,
      };
    }

    // Additional business logic validation
    const validation = this.validateBusinessRules(
      currentStatus,
      targetStatus,
      order
    );
    if (!validation.isValid) {
      return validation;
    }

    return { isValid: true };
  }

  /**
   * Validate business rules for status transitions
   */
  private static validateBusinessRules(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
    order?: Order
  ): StatusTransitionValidation {
    const warnings: string[] = [];
    let requiresConfirmation = false;

    // Validate payment-related transitions
    if (targetStatus === OrderStatus.PAID && order) {
      if (order.totalCents <= 0) {
        return {
          isValid: false,
          reason:
            "Cannot mark order as paid - total amount is zero or negative",
        };
      }
    }

    // Validate cancellation rules
    if (targetStatus === OrderStatus.CANCELLED) {
      if (
        currentStatus === OrderStatus.SHIPPED ||
        currentStatus === OrderStatus.DELIVERED
      ) {
        return {
          isValid: false,
          reason:
            "Cannot cancel an order that has already been shipped or delivered",
        };
      }

      if (
        currentStatus === OrderStatus.PAID ||
        currentStatus === OrderStatus.FULFILLING
      ) {
        warnings.push("Cancelling a paid order may require refund processing");
        requiresConfirmation = true;
      }
    }

    // Validate shipping transitions
    if (targetStatus === OrderStatus.SHIPPED) {
      if (currentStatus !== OrderStatus.FULFILLING) {
        warnings.push(
          "Typically orders should be in FULFILLING status before shipping"
        );
      }
    }

    // Validate fulfillment transitions
    if (targetStatus === OrderStatus.FULFILLING) {
      if (currentStatus !== OrderStatus.PAID) {
        warnings.push(
          "Fulfillment typically starts after payment is confirmed"
        );
      }
    }

    // Validate refund transitions
    if (targetStatus === OrderStatus.REFUNDED) {
      if (
        currentStatus === OrderStatus.PENDING ||
        currentStatus === OrderStatus.AWAITING_PAYMENT
      ) {
        return {
          isValid: false,
          reason: "Cannot refund an unpaid order",
        };
      }
      requiresConfirmation = true;
      warnings.push("Refund processing will need to be handled separately");
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      requiresConfirmation,
    };
  }

  /**
   * Get all valid next transitions for an order
   */
  static getValidTransitions(currentStatus: OrderStatus): OrderStatus[] {
    return OrderTransitions[currentStatus] || [];
  }

  /**
   * Attempt to transition an order to a new status with full validation
   */
  static async transitionOrderStatus(
    orderId: string,
    targetStatus: OrderStatus,
    options: {
      reason?: string;
      adminUserId?: string;
      forceTransition?: boolean;
      skipValidation?: boolean;
    } = {}
  ): Promise<StatusTransitionResult> {
    try {
      // Get the current order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return {
          success: false,
          error: "Order not found",
        };
      }

      const currentStatus = order.status as OrderStatus;

      // Skip validation if requested (for emergency admin actions)
      if (!options.skipValidation) {
        const validation = this.validateTransition(
          currentStatus,
          targetStatus,
          order
        );

        if (!validation.isValid) {
          return {
            success: false,
            error: validation.reason,
            validTransitions: this.getValidTransitions(currentStatus),
          };
        }

        // Check if confirmation is required but force flag is not set
        if (validation.requiresConfirmation && !options.forceTransition) {
          return {
            success: false,
            error:
              "This transition requires confirmation due to potential business impact",
            validTransitions: this.getValidTransitions(currentStatus),
          };
        }
      }

      // Log the transition attempt
      await this.logTransitionAttempt({
        orderId,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        reason: options.reason,
        adminUserId: options.adminUserId,
        timestamp: new Date(),
      });

      // Perform the status update in a transaction
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // Update the order status
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: targetStatus,
            // Update timestamps for specific statuses
            ...(targetStatus === OrderStatus.PAID && { paidAt: new Date() }),
            ...(targetStatus === OrderStatus.SHIPPED && {
              shippedAt: new Date(),
            }),
            ...(targetStatus === OrderStatus.DELIVERED && {
              deliveredAt: new Date(),
            }),
          },
        });

        return updated;
      });

      // Create enhanced order event
      await OrderEventService.createStatusChangeEvent(
        orderId,
        currentStatus,
        targetStatus,
        options.reason,
        options.adminUserId
      );

      // Handle side effects for specific status transitions
      await this.handleStatusTransitionSideEffects(
        orderId,
        currentStatus,
        targetStatus,
        options.adminUserId
      );

      // Send customer notifications for status changes
      await OrderNotificationHandler.notifyOrderStatusChange(
        orderId,
        targetStatus,
        {
          fromStatus: currentStatus,
          adminUserId: options.adminUserId,
          reason: options.reason,
        }
      );

      // Broadcast real-time update
      try {
        const { broadcastUpdate } = await import("@/lib/server/realtime");
        broadcastUpdate({
          type: "order_update",
          userId: updatedOrder.userId || undefined,
          orderId: updatedOrder.id,
          payload: {
            orderId: updatedOrder.id,
            fromStatus: currentStatus,
            toStatus: targetStatus,
            orderStatus: updatedOrder.status,
            reason: options.reason,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error("Failed to broadcast real-time update:", error);
        // Don't fail the status transition for broadcast errors
      }

      return {
        success: true,
        updatedOrder,
      };
    } catch (error) {
      console.error("Error transitioning order status:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Handle side effects of status transitions
   */
  private static async handleStatusTransitionSideEffects(
    orderId: string,
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    adminUserId?: string
  ): Promise<void> {
    try {
      // Handle cancellation - restore stock
      if (
        toStatus === OrderStatus.CANCELLED &&
        fromStatus !== OrderStatus.CANCELLED
      ) {
        const { restoreStock } = await import("./inventory");
        const restoreResult = await restoreStock(orderId, "ORDER_CANCELLED");

        if (restoreResult.success) {
          await OrderEventService.createEvent({
            orderId,
            kind: "STOCK_RESTORED",
            message: `Stock restored due to order cancellation - ${restoreResult.restoredItems} items`,
            adminUserId,
            metadata: {
              statusChangeReason: "Order cancelled",
              totalQuantity: restoreResult.restoredItems,
            },
          });
        }
      }

      // Handle shipping - notifications are now handled automatically by OrderNotificationHandler
      if (toStatus === OrderStatus.SHIPPED) {
        await OrderEventService.createEvent({
          orderId,
          kind: "SHIPPING_PROCESSED",
          message: "Order shipped successfully",
          adminUserId,
          metadata: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Handle delivery - notifications are now handled automatically by OrderNotificationHandler
      if (toStatus === OrderStatus.DELIVERED) {
        await OrderEventService.createEvent({
          orderId,
          kind: "DELIVERY_CONFIRMED",
          message: "Order delivered successfully",
          adminUserId,
          metadata: {
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error("Error handling status transition side effects:", error);
      // Don't fail the main transition for side effect errors
    }
  }

  /**
   * Log transition attempts for audit purposes
   */
  private static async logTransitionAttempt(
    attempt: StatusTransitionAttempt
  ): Promise<void> {
    try {
      await OrderEventService.createEvent({
        orderId: attempt.orderId,
        kind: "STATUS_TRANSITION_ATTEMPT",
        message: `Status transition attempted: ${attempt.fromStatus} → ${attempt.toStatus}`,
        adminUserId: attempt.adminUserId,
        metadata: {
          previousStatus: attempt.fromStatus,
          newStatus: attempt.toStatus,
          statusChangeReason: attempt.reason,
          timestamp: attempt.timestamp.toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to log transition attempt:", error);
      // Don't fail the transition for logging errors
    }
  }

  /**
   * Get status transition history for an order
   */
  static async getTransitionHistory(orderId: string) {
    const events = await OrderEventService.getOrderEvents(orderId);

    return events.filter(
      (event) =>
        event.kind === "STATUS_CHANGE" ||
        event.kind === "STATUS_TRANSITION_ATTEMPT" ||
        event.kind === "ORDER_STATUS_CHANGED"
    );
  }

  /**
   * Bulk status transition with validation
   */
  static async bulkTransitionOrders(
    orderIds: string[],
    targetStatus: OrderStatus,
    options: {
      reason?: string;
      adminUserId?: string;
      continueOnError?: boolean;
    } = {}
  ): Promise<{
    successful: string[];
    failed: Array<{ orderId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ orderId: string; error: string }> = [];

    for (const orderId of orderIds) {
      try {
        const result = await this.transitionOrderStatus(orderId, targetStatus, {
          reason: options.reason,
          adminUserId: options.adminUserId,
          forceTransition: true, // Assume bulk operations are intentional
        });

        if (result.success) {
          successful.push(orderId);
        } else {
          failed.push({ orderId, error: result.error || "Unknown error" });
          if (!options.continueOnError) break;
        }
      } catch (error) {
        failed.push({
          orderId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        if (!options.continueOnError) break;
      }
    }

    return { successful, failed };
  }
}
