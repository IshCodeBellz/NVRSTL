import { rateLimit } from "@/lib/server/rateLimit";

describe("rateLimit utility", () => {
  test("allows 15 then blocks 16th within window", () => {
    const key = "test-key-" + Math.random().toString(36).slice(2, 8);
    const results = [] as boolean[];
    for (let i = 0; i < 16; i++) {
      results.push(rateLimit(key, 15, 60_000));
    }
    const allowed = results.slice(0, 15).every((r) => r === true);
    expect(allowed).toBe(true);
    expect(results[15]).toBe(false);
  });
});
