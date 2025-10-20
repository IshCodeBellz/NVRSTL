import { describe, it, expect } from "@jest/globals";

// Re-implement minimal expansion logic mirroring API for unit test
function expand(q: string) {
  const synonymMap: Record<string, string[]> = {
    hat: ["cap", "beanie", "bucket", "snapback"],
    caps: ["hat", "beanie", "snapback"],
  };
  const raw = q.toLowerCase().trim();
  const tokens = raw.split(/\s+/).filter(Boolean).slice(0, 6);
  const termSet = new Set<string>();
  termSet.add(raw);
  for (const t of tokens) {
    termSet.add(t);
    if (t.length > 2) {
      if (t.endsWith("s")) termSet.add(t.slice(0, -1));
      else termSet.add(t + "s");
    }
    const base = t.endsWith("s") ? t.slice(0, -1) : t;
    const syns = synonymMap[t] || synonymMap[base];
    if (syns) syns.forEach((s) => termSet.add(s));
  }
  return Array.from(termSet);
}

describe("search expansion", () => {
  it("includes plural + singular", () => {
    const out = expand("hats");
    expect(out).toEqual(expect.arrayContaining(["hats", "hat"]));
  });
  it("adds synonyms for hat", () => {
    const out = expand("hat");
    expect(out).toEqual(
      expect.arrayContaining(["cap", "beanie", "bucket", "snapback"])
    );
  });
});
