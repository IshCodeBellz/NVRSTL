import Stripe from "stripe";
import { validateEnv } from "@/lib/server/env";

let _stripe: Stripe | null = null;
export function getStripe(): Stripe | null {
  // In CI or test environment, always simulate (no external calls)
  if (process.env.CI === "true" || process.env.NODE_ENV === "test") {
    return null;
  }
  if (_stripe) return _stripe;
  validateEnv(); // one-time side effect
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Treat known placeholder or fake keys as simulate mode
  const isPlaceholder =
    /sk_(test|live)_fake/i.test(key) || key.includes("fake_key_for_ci");
  if (isPlaceholder) return null;
  // Use SDK default API version to avoid type mismatches across package updates
  _stripe = new Stripe(key);
  return _stripe;
}
