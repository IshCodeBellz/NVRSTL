import { describe, it, expect } from "@jest/globals";

interface Line {
  priceCents: number;
  qty: number;
}
function computeSubtotalCents(lines: Line[]) {
  return lines.reduce((s, l) => s + l.priceCents * l.qty, 0);
}

describe("cart subtotal math", () => {
  it("sums line extended amounts", () => {
    const subtotal = computeSubtotalCents([
      { priceCents: 1999, qty: 2 }, // 39.98
      { priceCents: 2500, qty: 1 }, // 25.00
    ]);
    expect(subtotal).toBe(1999 * 2 + 2500);
  });

  it("handles empty list", () => {
    expect(computeSubtotalCents([])).toBe(0);
  });
});
