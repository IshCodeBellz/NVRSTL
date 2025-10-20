import { getStripe } from "@/lib/server/stripe";

describe("stripe init", () => {
  test("returns Stripe instance when real key is available; null in CI/test", () => {
    const s = getStripe();
    const isCiOrTest =
      process.env.CI === "true" || process.env.NODE_ENV === "test";
    if (isCiOrTest) {
      // In CI/test we intentionally simulate and do not initialize Stripe
      expect(s).toBeNull();
    } else if (process.env.STRIPE_SECRET_KEY) {
      // In non-test env with a real key configured, Stripe should initialize
      expect(s).not.toBeNull();
      expect(s).toHaveProperty("paymentIntents");
      expect(s).toHaveProperty("customers");
    } else {
      // No key configured => null
      expect(s).toBeNull();
    }
  });
});
