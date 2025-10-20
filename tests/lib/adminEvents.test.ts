import {
  createAdminEventStream,
  broadcast,
} from "@/lib/server/events/adminEvents";

describe("adminEvents SSE broadcaster", () => {
  test("broadcast enqueues SSE formatted events to connected streams", async () => {
    const stream = createAdminEventStream();
    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    // Trigger a broadcast
    broadcast("order-status", { orderId: "evt-1", status: "FULFILLING" });
    const result = await reader.read();
    expect(result.done).toBe(false);
    const text = new TextDecoder().decode(result.value);
    expect(text).toContain("event: order-status");
    expect(text).toContain('data: {"orderId":"evt-1","status":"FULFILLING"}');
    await reader.cancel();
  });
});
