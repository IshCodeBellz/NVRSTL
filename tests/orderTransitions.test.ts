import { describe, it, expect } from "@jest/globals";
import { OrderTransitions, canTransition } from "@/lib/status";

describe("order status transitions", () => {
  it("allows valid path", () => {
    expect(canTransition("PENDING", "AWAITING_PAYMENT")).toBe(true);
  });
  it("rejects invalid path", () => {
    expect(canTransition("PENDING", "SHIPPED")).toBe(false);
  });
  it("is idempotent", () => {
    expect(canTransition("PAID", "PAID")).toBe(true);
  });
  it("transition map integrity", () => {
    // Simple invariant: every listed destination must itself be a key
    for (const [from, tos] of Object.entries(OrderTransitions)) {
      for (const t of tos) {
        expect(Object.prototype.hasOwnProperty.call(OrderTransitions, t)).toBe(
          true
        );
      }
    }
  });
});
