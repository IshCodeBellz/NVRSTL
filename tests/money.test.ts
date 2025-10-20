import { formatPriceCents } from "@/lib/money";

describe("formatPriceCents", () => {
  it("formats basic GBP values (default currency)", () => {
    expect(formatPriceCents(1999)).toMatch(/19\.99/);
    expect(formatPriceCents(0)).toMatch(/0\.00/);
    // Should default to GBP
    expect(formatPriceCents(1999)).toMatch(/£/);
  });

  it("respects custom currency", () => {
    const eur = formatPriceCents(1234, { currency: "EUR", locale: "en-GB" });
    expect(eur).toMatch(/12\.34/);
    expect(eur).toMatch(/€/);
  });

  it("formats USD currency", () => {
    const usd = formatPriceCents(2500, { currency: "USD", locale: "en-US" });
    expect(usd).toMatch(/25\.00/);
    expect(usd).toMatch(/\$/);
  });

  it("handles large amounts", () => {
    const large = formatPriceCents(123456789); // £1,234,567.89
    expect(large).toMatch(/1,234,567\.89/);
    expect(large).toMatch(/£/);
  });

  it("handles zero and small amounts", () => {
    expect(formatPriceCents(1)).toMatch(/0\.01/);
    expect(formatPriceCents(99)).toMatch(/0\.99/);
  });
});
