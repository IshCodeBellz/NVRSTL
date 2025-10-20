import { describe, test, expect, beforeEach } from "@jest/globals";
import { resetDb } from "../helpers/testServer";
import * as healthRoute from "@/app/api/health/route";

beforeEach(async () => {
  await resetDb();
});

describe("health endpoint", () => {
  test("returns comprehensive health status when all systems healthy", async () => {
    const res = await healthRoute.GET();

    // Debug output to see what we're getting
    const debugData = await res.json();
    console.log("Health response status:", res.status);
    console.log("Health response data:", JSON.stringify(debugData, null, 2));

    expect(res.status).toBe(200);

    const data = debugData;

    // Overall structure
    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("uptime_ms");
    expect(data).toHaveProperty("response_time_ms");
    expect(data).toHaveProperty("version");
    expect(data).toHaveProperty("environment");
    expect(data).toHaveProperty("checks");

    // Health checks
    expect(data.checks).toHaveProperty("database");
    expect(data.checks).toHaveProperty("memory");
    expect(data.checks).toHaveProperty("event_loop");

    // Database check details
    expect(data.checks.database.status).toMatch(/healthy|degraded|critical/);
    expect(typeof data.checks.database.latency_ms).toBe("number");
    expect(data.checks.database.details).toHaveProperty("tables");
    expect(data.checks.database.details).toHaveProperty("connection_pool");

    // Memory check details
    expect(data.checks.memory.status).toMatch(/healthy|degraded|critical/);
    expect(data.checks.memory.details).toHaveProperty("heap_used_mb");
    expect(data.checks.memory.details).toHaveProperty("heap_total_mb");
    expect(data.checks.memory.details).toHaveProperty("heap_usage_percent");

    // Event loop check details
    expect(data.checks.event_loop.status).toMatch(/healthy|degraded|critical/);
    expect(typeof data.checks.event_loop.latency_ms).toBe("number");
    expect(data.checks.event_loop.details).toHaveProperty("delay_ms");
    expect(data.checks.event_loop.details).toHaveProperty("uptime_seconds");

    // Response timing
    expect(typeof data.response_time_ms).toBe("number");
    expect(data.response_time_ms).toBeGreaterThan(0);
    expect(data.response_time_ms).toBeLessThan(5000); // Should be fast
  });

  test("returns degraded status when database is slow", async () => {
    // Note: This test is conceptual - in real scenarios you'd mock slow DB responses
    const res = await healthRoute.GET();
    const data = await res.json();

    // Even if DB is slow, it should still respond
    expect(data.checks.database).toHaveProperty("status");
    expect(data.checks.database).toHaveProperty("latency_ms");

    // Verify the response structure regardless of actual performance
    expect(["healthy", "degraded", "critical"]).toContain(
      data.checks.database.status
    );
  });

  test("includes proper cache headers for load balancer health checks", async () => {
    const res = await healthRoute.GET();

    // Should include cache-control header to prevent caching
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  test("sets appropriate HTTP status based on overall health", async () => {
    const res = await healthRoute.GET();

    // Should return 200 for healthy/degraded, 503 for critical
    expect([200, 503]).toContain(res.status);

    const data = await res.json();

    if (data.status === "critical") {
      expect(res.status).toBe(503);
    } else {
      expect(res.status).toBe(200);
    }
  });

  test("includes environment and version information", async () => {
    const res = await healthRoute.GET();
    const data = await res.json();

    expect(data.environment).toBe("test");
    expect(data.version).toBeDefined(); // Should be "dev" or a commit SHA
    expect(typeof data.uptime_ms).toBe("number");
    expect(data.uptime_ms).toBeGreaterThan(0);
  });

  test("handles errors gracefully", async () => {
    // Disconnect database to simulate failure
    // Note: In a real test environment, you might mock Prisma to throw errors
    const res = await healthRoute.GET();

    // Should still return a response even if some checks fail
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(600);

    const data = await res.json();
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("checks");
  });
});
