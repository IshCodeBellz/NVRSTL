import { describe, it, expect } from "@jest/globals";

const HALF_LIFE_HOURS = 72;

function score(weighted: number, createdAt: Date, now: Date) {
  const ageHours = (now.getTime() - createdAt.getTime()) / 3600000;
  const decay = 1 / (1 + ageHours / HALF_LIFE_HOURS);
  return weighted * decay;
}

describe("trending decay", () => {
  it("decays over time", () => {
    const now = new Date();
    const fresh = score(100, now, now);
    const old = score(100, new Date(now.getTime() - 72 * 3600000), now); // half-life
    expect(old).toBeLessThan(fresh);
    // At half-life, decay should be ~ 1 / (1 + 1) = 0.5
    expect(old / fresh).toBeGreaterThan(0.45);
    expect(old / fresh).toBeLessThan(0.55);
  });
});
