import { buildDraftFromCart, calculateRates } from "@/lib/server/taxShipping";

describe("tax & shipping framework", () => {
  it("applies US-CA tax and free shipping threshold", async () => {
    const draft = buildDraftFromCart({
      lines: [
        { priceCentsSnapshot: 4000, qty: 2, productId: "p1" }, // subtotal 8000
      ],
      destination: { country: "US", region: "CA", postalCode: "94107" },
    });
    const res = await calculateRates(draft);
    expect(res.taxCents).toBeGreaterThan(0); // 8000 * 7.25% => 580
    expect(res.taxCents).toBe(580);
    expect(res.shippingCents).toBe(0); // free shipping threshold
    expect(
      res.breakdown.adjustments?.some(
        (a) => a.reason === "FREE_SHIPPING_THRESHOLD"
      )
    ).toBe(true);
  });

  it("applies base US shipping below threshold", async () => {
    const draft = buildDraftFromCart({
      lines: [{ priceCentsSnapshot: 2000, qty: 1, productId: "p1" }], // subtotal 2000
      destination: { country: "US", region: "CA", postalCode: "90001" },
    });
    const res = await calculateRates(draft);
    expect(res.shippingCents).toBeGreaterThan(0); // 599 + per item 100 = 699
    expect(res.shippingCents).toBe(699);
  });
});
