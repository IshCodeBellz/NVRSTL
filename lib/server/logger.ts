import { randomUUID } from "crypto";

// Simple in-memory latency buckets (best effort; resets on deploy)
const latencyBuckets = [50, 100, 250, 500, 1000, 2000, 5000];
const latencyCounts: Record<string, number> = {};
function recordLatency(ms: number) {
  const bucket = latencyBuckets.find((b) => ms <= b) || ">5000";
  const key = typeof bucket === "number" ? `le_${bucket}` : bucket;
  latencyCounts[key] = (latencyCounts[key] || 0) + 1;
}
export function getLatencySnapshot() {
  return { ...latencyCounts };
}

// Create logger object for backward compatibility
export const logger = {
  info: log,
  warn,
  error,
  debug: log,
};

// Export individual functions with their original names
export { log as logInfo, warn as logWarn, error as logError };

// Simple auth check function
export async function requireAuth(
  request: Request
): Promise<{ id: string; role: string }> {
  const userId = request.headers.get("x-demo-user");
  if (!userId) {
    throw new Error("Unauthorized");
  }
  // For demo purposes, treat all authenticated users as admins
  return { id: userId, role: "admin" };
}

export interface LogFields {
  [k: string]: unknown;
}

function base(fields: LogFields) {
  return JSON.stringify({ ts: new Date().toISOString(), ...fields });
}

const silent = () => process.env.JEST_SILENT_LOG === "1";
export function log(msg: string, fields: LogFields = {}) {
  if (silent()) return;
  console.log(base({ level: "info", msg, ...fields }));
}
export function warn(msg: string, fields: LogFields = {}) {
  if (silent()) return;
  console.warn(base({ level: "warn", msg, ...fields }));
}
export function error(msg: string, fields?: unknown) {
  if (silent()) return;
  let extra: LogFields = {};
  if (fields instanceof Error) {
    extra = { err: fields.message, stack: fields.stack };
  } else if (fields && typeof fields === "object" && !Array.isArray(fields)) {
    extra = fields as LogFields;
  } else if (fields !== undefined) {
    extra = { err: String(fields) };
  }
  console.error(base({ level: "error", msg, ...extra }));
}

interface RequestLike {
  headers?: {
    get?: (name: string) => string | null;
  };
  method?: string;
  nextUrl?: {
    pathname?: string;
    search?: string;
  };
}

interface ResponseLike {
  status?: number;
}

// Simplified wrapper for Next.js route handlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withRequest<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  // Wrap a Next.js route handler to add a request id & latency logging
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async function wrapped(this: unknown, ...args: any[]) {
    const start = Date.now();
    const req = args[0] as RequestLike;
    const rid = req?.headers?.get?.("x-request-id") || randomUUID();
    try {
      const res = await handler.apply(this, args);
      const dur = Date.now() - start;
      const method = req?.method;
      const userId = req?.headers?.get?.("x-demo-user") || undefined;
      recordLatency(dur);
      log("req_complete", {
        path: req?.nextUrl?.pathname,
        query: req?.nextUrl?.search || undefined,
        method,
        rid,
        ms: dur,
        latencyBucket: latencyBuckets.find((b) => dur <= b) || ">5000",
        status: (res as ResponseLike)?.status,
        userId,
      });
      return res;
    } catch (e: unknown) {
      const dur = Date.now() - start;
      const method = req?.method;
      const userId = req?.headers?.get?.("x-demo-user") || undefined;
      recordLatency(dur);
      error("req_error", {
        path: req?.nextUrl?.pathname,
        query: req?.nextUrl?.search || undefined,
        method,
        rid,
        ms: dur,
        latencyBucket: latencyBuckets.find((b) => dur <= b) || ">5000",
        err: e instanceof Error ? e.message : String(e),
        userId,
      });
      throw e;
    }
  } as T;
}
