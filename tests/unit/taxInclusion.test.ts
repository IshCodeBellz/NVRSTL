import { buildDraftFromCart, calculateRates } from "@/lib/server/taxShipping";

// Save and restore env to avoid cross-test pollution
const OLD_ENV = { ...process.env };

describe("tax inclusion by currency", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("uses included-tax math when currency is base (GBP)", async () => {
    // No env var needed; base currency GBP should be inclusive by default
    const draft = buildDraftFromCart({
      lines: [
        { priceCentsSnapshot: 6000, qty: 1, productId: "p1" }, // subtotal 6000
      ],
      destination: { country: "GB", postalCode: "SW1A 1AA" },
      currency: "GBP",
    });
    const res = await calculateRates(draft);
    expect(res.breakdown.pricesIncludeTax).toBe(true);
    // UK VAT 20% included: included tax = subtotal - subtotal/(1+0.2)
    expect(res.taxCents).toBe(1000); // 6000 - 5000 = 1000
  });

  it("treats configured currencies as tax-inclusive (EUR)", async () => {
    process.env.TAX_INCLUSIVE_CURRENCIES = "EUR";

    const draft = buildDraftFromCart({
      lines: [
        { priceCentsSnapshot: 12000, qty: 1, productId: "p1" }, // subtotal 12000
      ],
      destination: { country: "GB", postalCode: "SW1A 1AA" },
      currency: "EUR",
    });
    const res = await calculateRates(draft);
    expect(res.breakdown.pricesIncludeTax).toBe(true);
    // UK VAT 20% included: 12000 - 12000/1.2 = 2000
    expect(res.taxCents).toBe(2000);
  });

  it("remains tax-exclusive for non-inclusive currencies (USD)", async () => {
    delete process.env.TAX_INCLUSIVE_CURRENCIES;

    const draft = buildDraftFromCart({
      lines: [
        { priceCentsSnapshot: 8000, qty: 1, productId: "p1" }, // subtotal 8000
      ],
      destination: { country: "US", region: "CA", postalCode: "94107" },
      currency: "USD",
    });
    const res = await calculateRates(draft);
    expect(res.breakdown.pricesIncludeTax).toBe(false);
    // US-CA 7.25% of 8000 = 580
    expect(res.taxCents).toBe(580);
  });
});
