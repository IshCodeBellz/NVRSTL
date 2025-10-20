import { captureException } from "@sentry/nextjs";
import { alerts } from "./alerts";
import { perfMonitor } from "./performance";

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
  jitter: boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
}

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

class CircuitBreaker {
  private state: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private name: string, private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = "HALF_OPEN";
        this.successCount = 0;
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= 3) {
        // Require 3 successful calls to close
        this.state = "CLOSED";
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = "OPEN";

      // Alert on circuit breaker opening
      alerts
        .createAlert(
          "circuit_breaker_open",
          "high",
          "Circuit Breaker Opened",
          `Circuit breaker ${this.name} opened after ${this.failureCount} failures`,
          {
            circuit_breaker: this.name,
            failure_count: this.failureCount,
            threshold: this.config.failureThreshold,
          },
          ["sentry", "email"]
        )
        .catch(console.error);
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

export class ErrorRecovery {
  private static circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private static retryAttempts: Map<string, number> = new Map();

  // Retry with exponential backoff
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    operationName?: string
  ): Promise<T> {
    const defaultConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      jitter: true,
    };

    const retryConfig = { ...defaultConfig, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        const result = await perfMonitor.timeFunction(
          operationName || "retry_operation",
          operation,
          {
            attempt: attempt.toString(),
            max_attempts: retryConfig.maxAttempts.toString(),
          }
        );

        // Track successful retry if not first attempt
        if (attempt > 1 && operationName) {
          this.retryAttempts.set(operationName, attempt);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on last attempt
        if (attempt === retryConfig.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff and optional jitter
        let delay = Math.min(
          retryConfig.baseDelay *
            Math.pow(retryConfig.backoffFactor, attempt - 1),
          retryConfig.maxDelay
        );

        if (retryConfig.jitter) {
          delay *= 0.5 + Math.random() * 0.5; // Add jitter (50% to 100% of calculated delay)
        }

        console.warn(
          `Attempt ${attempt} failed for ${
            operationName || "operation"
          }, retrying in ${delay}ms:`,
          lastError.message
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    if (operationName) {
      alerts
        .createAlert(
          "operation_failed_after_retries",
          "high",
          "Operation Failed After Retries",
          `${operationName} failed after ${retryConfig.maxAttempts} attempts`,
          {
            operation: operationName,
            attempts: retryConfig.maxAttempts,
            error: lastError!.message,
          }
        )
        .catch(console.error);
    }

    captureException(lastError!, {
      tags: {
        operation: operationName || "unknown",
        retry_attempts: retryConfig.maxAttempts.toString(),
        error_type: "retry_exhausted",
      },
    });

    throw lastError!;
  }

  // Circuit breaker pattern
  static async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    breakerName: string,
    config: Partial<CircuitBreakerConfig> = {}
  ): Promise<T> {
    const defaultConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
    };

    const breakerConfig = { ...defaultConfig, ...config };

    if (!this.circuitBreakers.has(breakerName)) {
      this.circuitBreakers.set(
        breakerName,
        new CircuitBreaker(breakerName, breakerConfig)
      );
    }

    const breaker = this.circuitBreakers.get(breakerName)!;
    return breaker.execute(operation);
  }

  // Combine retry and circuit breaker
  static async withRetryAndCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryConfig: Partial<RetryConfig> = {},
    breakerConfig: Partial<CircuitBreakerConfig> = {}
  ): Promise<T> {
    return this.withCircuitBreaker(
      () => this.withRetry(operation, retryConfig, operationName),
      `${operationName}_circuit_breaker`,
      breakerConfig
    );
  }

  // Error classification for better handling
  static classifyError(error: Error): {
    type:
      | "network"
      | "timeout"
      | "authentication"
      | "rate_limit"
      | "server_error"
      | "client_error"
      | "unknown";
    retryable: boolean;
    severity: "low" | "medium" | "high" | "critical";
  } {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("econnreset")
    ) {
      return { type: "network", retryable: true, severity: "medium" };
    }

    // Timeout errors
    if (message.includes("timeout") || message.includes("timed out")) {
      return { type: "timeout", retryable: true, severity: "medium" };
    }

    // Authentication errors
    if (
      message.includes("unauthorized") ||
      message.includes("authentication") ||
      message.includes("401")
    ) {
      return { type: "authentication", retryable: false, severity: "high" };
    }

    // Rate limiting
    if (
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("429")
    ) {
      return { type: "rate_limit", retryable: true, severity: "medium" };
    }

    // Server errors (5xx)
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504")
    ) {
      return { type: "server_error", retryable: true, severity: "high" };
    }

    // Client errors (4xx)
    if (
      message.includes("400") ||
      message.includes("404") ||
      message.includes("422")
    ) {
      return { type: "client_error", retryable: false, severity: "medium" };
    }

    return { type: "unknown", retryable: true, severity: "medium" };
  }

  // Smart retry based on error type
  static async smartRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const classification = this.classifyError(err);

      if (!classification.retryable) {
        // Don't retry non-retryable errors
        captureException(err, {
          tags: {
            operation: operationName,
            error_type: classification.type,
            retryable: "false",
          },
        });
        throw err;
      }

      // Configure retry based on error type
      const retryConfig: Partial<RetryConfig> = {};

      switch (classification.type) {
        case "network":
        case "timeout":
          retryConfig.maxAttempts = 3;
          retryConfig.baseDelay = 2000;
          break;
        case "rate_limit":
          retryConfig.maxAttempts = 5;
          retryConfig.baseDelay = 5000;
          retryConfig.backoffFactor = 1.5;
          break;
        case "server_error":
          retryConfig.maxAttempts = 4;
          retryConfig.baseDelay = 1500;
          break;
        default:
          retryConfig.maxAttempts = 2;
          retryConfig.baseDelay = 1000;
      }

      return this.withRetry(operation, retryConfig, operationName);
    }
  }

  // Get circuit breaker status
  static getCircuitBreakerStatus(): Array<{
    name: string;
    state: CircuitBreakerState;
    failureCount: number;
  }> {
    return Array.from(this.circuitBreakers.entries()).map(
      ([name, breaker]) => ({
        name,
        state: breaker.getState(),
        failureCount: breaker.getFailureCount(),
      })
    );
  }

  // Reset circuit breaker
  static resetCircuitBreaker(name: string): boolean {
    const breaker = this.circuitBreakers.get(name);
    if (breaker) {
      breaker.reset();
      return true;
    }
    return false;
  }

  // Get retry statistics
  static getRetryStats(): Array<{ operation: string; lastAttempts: number }> {
    return Array.from(this.retryAttempts.entries()).map(
      ([operation, attempts]) => ({
        operation,
        lastAttempts: attempts,
      })
    );
  }

  // Bulk error handling for operations
  static async handleBulkOperations<T>(
    operations: Array<() => Promise<T>>,
    operationName: string,
    options: {
      concurrency?: number;
      failFast?: boolean;
      errorThreshold?: number; // Percentage of operations that can fail
    } = {}
  ): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
    const { concurrency = 5, failFast = false, errorThreshold = 20 } = options;
    const results: Array<{ success: boolean; result?: T; error?: Error }> = [];
    let errorCount = 0;

    // Process operations in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map((op) => this.smartRetry(op, operationName))
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push({ success: true, result: result.value });
        } else {
          errorCount++;
          results.push({ success: false, error: result.reason });

          // Check if we should fail fast
          if (failFast) {
            throw result.reason;
          }
        }
      }

      // Check error threshold
      const errorRate = (errorCount / results.length) * 100;
      if (errorRate > errorThreshold) {
        const error = new Error(
          `Error threshold exceeded: ${errorRate.toFixed(
            1
          )}% > ${errorThreshold}% (${errorCount}/${
            results.length
          } operations failed)`
        );

        alerts
          .createAlert(
            "bulk_operation_failure_threshold",
            "critical",
            "Bulk Operation Error Threshold Exceeded",
            error.message,
            {
              operation: operationName,
              error_rate: errorRate,
              threshold: errorThreshold,
              failed_count: errorCount,
              total_count: results.length,
            }
          )
          .catch(console.error);

        throw error;
      }
    }

    return results;
  }
}

// Convenience exports
export const {
  withRetry,
  withCircuitBreaker,
  smartRetry,
  handleBulkOperations,
} = ErrorRecovery;
