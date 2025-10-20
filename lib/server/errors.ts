// Enhanced error handling utilities with Sentry integration
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export interface ErrorContext {
  userId?: string;
  route?: string;
  operation?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly context?: ErrorContext;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true,
    context?: ErrorContext
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.context = context;

    // Capture stack trace
    Error.captureStackTrace(this, AppError);
  }
}

// Pre-defined error types for common scenarios
export class ValidationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 400, "VALIDATION_ERROR", true, context);
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string = "Authentication required",
    context?: ErrorContext
  ) {
    super(message, 401, "AUTHENTICATION_ERROR", true, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = "Insufficient permissions",
    context?: ErrorContext
  ) {
    super(message, 403, "AUTHORIZATION_ERROR", true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource", context?: ErrorContext) {
    super(`${resource} not found`, 404, "NOT_FOUND", true, context);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 409, "CONFLICT_ERROR", true, context);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded", context?: ErrorContext) {
    super(message, 429, "RATE_LIMIT_ERROR", true, context);
  }
}

// Error capture utility
export function captureError(
  error: Error | AppError,
  context?: ErrorContext,
  level: "error" | "warning" | "info" = "error"
) {
  // Skip capturing in test environment
  if (process.env.NODE_ENV === "test") return;

  // Set context for Sentry
  Sentry.withScope((scope) => {
    scope.setLevel(level);

    if (context) {
      if (context.userId) scope.setUser({ id: context.userId });
      if (context.route) scope.setTag("route", context.route);
      if (context.operation) scope.setTag("operation", context.operation);
      if (context.metadata) {
        Object.entries(context.metadata).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
      }
    }

    // Add error type information
    if (error instanceof AppError) {
      scope.setTag("error_code", error.code);
      scope.setTag("error_operational", error.isOperational);
      scope.setLevel(error.statusCode >= 500 ? "error" : "warning");
    }

    // Capture the error
    Sentry.captureException(error);
  });

  // Also log to console with context
  const logMethod =
    level === "error"
      ? console.error
      : level === "warning"
      ? console.warn
      : console.info;

  logMethod("[Error Captured]", {
    message: error.message,
    code: error instanceof AppError ? error.code : "UNKNOWN",
    context,
    stack: error.stack,
  });
}

// API error response helper
export function createErrorResponse(
  error: Error | AppError,
  context?: ErrorContext
): NextResponse {
  // Capture error for monitoring
  captureError(error, context);

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
        ...(error.context && { context: error.context }),
      },
      { status: error.statusCode }
    );
  }

  // Generic error response
  const isDevelopment = process.env.NODE_ENV === "development";
  return NextResponse.json(
    {
      error: "INTERNAL_ERROR",
      message: isDevelopment ? error.message : "An internal error occurred",
      ...(isDevelopment && { stack: error.stack }),
    },
    { status: 500 }
  );
}

// Async error wrapper for API routes
export function withErrorHandling<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>,
  context?: Omit<ErrorContext, "route">
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("Error:", error);
      if (error instanceof AppError) {
        throw error; // Re-throw AppErrors as-is
      }

      // Wrap unexpected errors
      const wrappedError = new AppError(
        error instanceof Error ? error.message : "Unknown error occurred",
        500,
        "UNEXPECTED_ERROR",
        false, // Non-operational since it's unexpected
        context
      );

      captureError(wrappedError, context);
      throw wrappedError;
    }
  };
}

// Performance monitoring utility
export function trackPerformance(
  operation: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
) {
  const span = Sentry.startSpan(
    {
      name: operation,
      op: "custom",
    },
    () => {
      // Return a performance tracking object
      return {
        finish: (status?: "ok" | "error") => {
          if (status === "error") {
            Sentry.setTag("operation_status", "error");
          }
        },
        setTag: (key: string, value: string) => Sentry.setTag(key, value),
        setData: (key: string, value: Record<string, unknown> | null) =>
          Sentry.setContext(key, value),
      };
    }
  );

  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      Sentry.setTag(key, value);
    });
  }

  return span;
}

// Health check helper
export function reportHealthStatus(
  component: string,
  status: "healthy" | "degraded" | "critical",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
) {
  if (status !== "healthy") {
    Sentry.addBreadcrumb({
      message: `Health check: ${component} is ${status}`,
      level: status === "critical" ? "error" : "warning",
      data: metadata,
    });
  }
}
