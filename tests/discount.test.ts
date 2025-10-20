import { describe, it, expect } from "@jest/globals";

function applyDiscount(
  subtotalCents: number,
  kind: "FIXED" | "PERCENT",
  value: number
) {
  if (kind === "FIXED") return Math.min(subtotalCents, value);
  return Math.min(subtotalCents, Math.floor((subtotalCents * value) / 100));
}

describe("discount application", () => {
  it("caps fixed discount to subtotal", () => {
    expect(applyDiscount(1000, "FIXED", 1500)).toBe(1000);
  });
  it("percent calculation floors properly", () => {
    expect(applyDiscount(999, "PERCENT", 10)).toBe(
      Math.floor((999 * 10) / 100)
    );
  });
});
