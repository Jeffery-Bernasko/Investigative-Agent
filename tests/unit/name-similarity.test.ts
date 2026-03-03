import { describe, it, expect } from "vitest";
import {
  normalizeName,
  damerauLevenshteinDistance,
  stringSimilarity,
  computeNameSimilarity,
} from "../../src/lib/agents/utils/name-similarity";

// ═══════════════════════════════════════════════════════
// normalizeName
// ═══════════════════════════════════════════════════════

describe("normalizeName", () => {
  it("lowercases the string", () => {
    expect(normalizeName("JOHN SMITH")).toBe("john smith");
  });

  it("strips diacritics", () => {
    expect(normalizeName("José García")).toBe("jose garcia");
  });

  it("strips special characters", () => {
    expect(normalizeName("O'Brien-Smith")).toBe("obrien smith");
  });

  it("collapses extra whitespace", () => {
    expect(normalizeName("  John   Smith  ")).toBe("john smith");
  });

  it("handles empty string", () => {
    expect(normalizeName("")).toBe("");
  });
});

// ═══════════════════════════════════════════════════════
// levenshteinDistance
// ═══════════════════════════════════════════════════════

describe("damerauLevenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(damerauLevenshteinDistance("abc", "abc")).toBe(0);
  });

  it("returns full length for empty vs non-empty", () => {
    expect(damerauLevenshteinDistance("", "abc")).toBe(3);
    expect(damerauLevenshteinDistance("abc", "")).toBe(3);
  });

  it("computes single substitution", () => {
    expect(damerauLevenshteinDistance("kitten", "sitten")).toBe(1);
  });

  it("computes single insertion", () => {
    expect(damerauLevenshteinDistance("cat", "cats")).toBe(1);
  });

  it("computes single deletion", () => {
    expect(damerauLevenshteinDistance("cats", "cat")).toBe(1);
  });

  it("computes classic kitten-sitting distance", () => {
    expect(damerauLevenshteinDistance("kitten", "sitting")).toBe(3);
  });

  it("handles two empty strings", () => {
    expect(damerauLevenshteinDistance("", "")).toBe(0);
  });

  it("counts adjacent transposition as 1 edit", () => {
    // "ab" → "ba" is one transposition
    expect(damerauLevenshteinDistance("ab", "ba")).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════
// stringSimilarity
// ═══════════════════════════════════════════════════════

describe("stringSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(stringSimilarity("abc", "abc")).toBe(1);
  });

  it("returns 1 for two empty strings", () => {
    expect(stringSimilarity("", "")).toBe(1);
  });

  it("returns 0 for completely different strings of equal length", () => {
    expect(stringSimilarity("abc", "xyz")).toBe(0);
  });

  it("returns a partial score for partially matching strings", () => {
    const sim = stringSimilarity("john", "jon");
    expect(sim).toBeGreaterThan(0.5);
    expect(sim).toBeLessThan(1);
  });
});

// ═══════════════════════════════════════════════════════
// computeNameSimilarity — PRD test cases
// ═══════════════════════════════════════════════════════

describe("computeNameSimilarity", () => {
  it("exact match → 1.0", () => {
    expect(computeNameSimilarity("John Smith", "John Smith")).toBe(1.0);
  });

  it("single typo → ≥ 0.9", () => {
    // "Jon Smith" vs "John Smith" — one character off
    expect(computeNameSimilarity("John Smith", "Jon Smith")).toBeGreaterThanOrEqual(0.9);
  });

  it("abbreviated first name → ≥ 0.8", () => {
    expect(computeNameSimilarity("John Smith", "J. Smith")).toBeGreaterThanOrEqual(0.8);
  });

  it("spelling variant — Jeffrey vs Jeffery → ≥ 0.9", () => {
    expect(computeNameSimilarity("Jeffrey Bernasko", "Jeffery Bernasko")).toBeGreaterThanOrEqual(0.9);
  });

  it("case insensitive", () => {
    expect(computeNameSimilarity("john smith", "JOHN SMITH")).toBe(1.0);
  });

  it("diacritics — José matches Jose → ≥ 0.95", () => {
    expect(computeNameSimilarity("José García", "Jose Garcia")).toBeGreaterThanOrEqual(0.95);
  });

  it("completely different names → low score", () => {
    expect(computeNameSimilarity("Alice Johnson", "Bob Williams")).toBeLessThan(0.5);
  });

  it("single token match (last name only) → moderate score", () => {
    const sim = computeNameSimilarity("Smith", "John Smith");
    expect(sim).toBeGreaterThan(0.4);
  });

  it("empty strings → 1.0 (both empty)", () => {
    expect(computeNameSimilarity("", "")).toBe(1.0);
  });

  it("one empty string → 0", () => {
    expect(computeNameSimilarity("John Smith", "")).toBe(0);
  });

  it("partial abbreviation 'J' matches 'John' token → boosted", () => {
    const sim = computeNameSimilarity("J Smith", "John Smith");
    expect(sim).toBeGreaterThanOrEqual(0.8);
  });

  it("reversed order of tokens has reasonable similarity", () => {
    // "Smith John" vs "John Smith" — same tokens, different order
    const sim = computeNameSimilarity("Smith John", "John Smith");
    expect(sim).toBeGreaterThan(0.6);
  });

  it("extra middle name doesn't collapse similarity", () => {
    const sim = computeNameSimilarity("John A Smith", "John Smith");
    expect(sim).toBeGreaterThan(0.7);
  });

  it("hyphenated last name with diacritics", () => {
    const sim = computeNameSimilarity("Müller-Schmidt", "Muller-Schmidt");
    expect(sim).toBeGreaterThanOrEqual(0.9);
  });
});
