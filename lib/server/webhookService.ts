import { OrderEventKind } from "@/lib/status";
import { prisma } from "@/lib/server/prisma";

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  created: number;
}

export interface WebhookRetryAttempt {
  attempt: number;
  timestamp: Date;
  error?: string;
  success: boolean;
}

export interface WebhookProcessingResult {
  success: boolean;
  error?: string;
  attempts: WebhookRetryAttempt[];
  shouldRetry: boolean;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

export class WebhookService {
  /**
   * Process webhook with retry logic
   */
  static async processWithRetry(
    event: WebhookEvent,
    processor: (event: WebhookEvent) => Promise<void>
  ): Promise<WebhookProcessingResult> {
    const attempts: WebhookRetryAttempt[] = [];

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      const attemptStart = new Date();

      try {
        await processor(event);

        attempts.push({
          attempt: attempt + 1,
          timestamp: attemptStart,
          success: true,
        });

        // Log successful processing
        await this.logWebhookEvent(event.id, "SUCCESS", {
          attempts: attempts.length,
          finalAttempt: attempt + 1,
        });

        return {
          success: true,
          attempts,
          shouldRetry: false,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        attempts.push({
          attempt: attempt + 1,
          timestamp: attemptStart,
          error: errorMessage,
          success: false,
        });

        console.error(
          `Webhook processing attempt ${attempt + 1} failed:`,
          errorMessage
        );

        // If this is the last attempt, log failure and return
        if (attempt === MAX_RETRY_ATTEMPTS - 1) {
          await this.logWebhookEvent(event.id, "FAILED", {
            attempts: attempts.length,
            finalError: errorMessage,
            allAttempts: attempts,
          });

          return {
            success: false,
            error: errorMessage,
            attempts,
            shouldRetry: false,
          };
        }

        // Wait before next retry
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAYS[attempt])
        );
      }
    }

    return {
      success: false,
      error: "Max retry attempts exceeded",
      attempts,
      shouldRetry: false,
    };
  }

  /**
   * Log webhook processing events
   */
  private static async logWebhookEvent(
    webhookId: string,
    status: "SUCCESS" | "FAILED" | "RETRY",
    meta: Record<string, unknown>
  ): Promise<void> {
    try {
      // Create a webhook log entry
      await prisma.orderEvent.create({
        data: {
          orderId: (meta.orderId as string) || webhookId, // Use webhookId as fallback
          kind: OrderEventKind.ORDER_CREATED, // Use available event kind as fallback
          message: `Webhook ${status.toLowerCase()}: ${webhookId}`,
          meta: JSON.stringify({
            webhookId,
            status,
            timestamp: new Date().toISOString(),
            ...meta,
          }),
        },
      });
    } catch (error) {
      console.error("Failed to log webhook event:", error);
      // Don't throw - logging failures shouldn't break webhook processing
    }
  }

  /**
   * Validate webhook signature (for Stripe)
   */
  static validateStripeSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const crypto = require("crypto");
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload, "utf8")
        .digest("hex");

      const receivedSignature = signature.replace("sha256=", "");

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(receivedSignature)
      );
    } catch (error) {
      console.error("Webhook signature validation error:", error);
      return false;
    }
  }

  /**
   * Extract order ID from payment reference
   */
  static extractOrderId(paymentRef: string): string | null {
    try {
      // Assuming payment ref format: order_<orderId>_<timestamp>
      const match = paymentRef.match(/^order_([a-zA-Z0-9]+)_/);
      return match ? match[1] : null;
    } catch (error) {
      console.error("Error extracting order ID:", error);
      return null;
    }
  }

  /**
   * Check if webhook is duplicate (idempotency check)
   */
  static async isDuplicateWebhook(webhookId: string): Promise<boolean> {
    try {
      const existingEvent = await prisma.orderEvent.findFirst({
        where: {
          meta: {
            contains: webhookId,
          },
          kind: {
            in: [
              OrderEventKind.PAYMENT_SUCCEEDED,
              OrderEventKind.PAYMENT_FAILED,
            ],
          },
        },
      });

      return !!existingEvent;
    } catch (error) {
      console.error("Error checking webhook duplicates:", error);
      return false; // Err on the side of processing
    }
  }
}
