import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  normalizeLocation,
  normalizeCompany,
  normalizeInstitution,
  calculateConfidence,
  verifyProfile,
} from "../../src/lib/agents/tools/profile-verification";

// ═══════════════════════════════════════════════════════
// normalizeLocation
// ═══════════════════════════════════════════════════════

describe("normalizeLocation", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeLocation("New York, NY")).toBe("new york ny");
  });

  it("removes region/city keywords", () => {
    expect(normalizeLocation("San Francisco City")).toBe("san francisco");
  });

  it("collapses whitespace", () => {
    expect(normalizeLocation("  London   UK  ")).toBe("london uk");
  });

  it("handles empty string", () => {
    expect(normalizeLocation("")).toBe("");
  });
});

// ═══════════════════════════════════════════════════════
// normalizeCompany
// ═══════════════════════════════════════════════════════

describe("normalizeCompany", () => {
  it("strips Inc suffix", () => {
    expect(normalizeCompany("Acme Inc")).toBe("acme");
  });

  it("strips LLC suffix", () => {
    expect(normalizeCompany("StartupCo LLC")).toBe("startupco");
  });

  it("strips Corp suffix", () => {
    expect(normalizeCompany("BigCorp Corporation")).toBe("bigcorp");
  });

  it("strips Ltd suffix", () => {
    expect(normalizeCompany("Widgets Ltd")).toBe("widgets");
  });

  it("lowercases", () => {
    expect(normalizeCompany("GOOGLE")).toBe("google");
  });

  it("handles empty string", () => {
    expect(normalizeCompany("")).toBe("");
  });
});

// ═══════════════════════════════════════════════════════
// normalizeInstitution
// ═══════════════════════════════════════════════════════

describe("normalizeInstitution", () => {
  it("strips 'University of'", () => {
    expect(normalizeInstitution("University of Michigan")).toBe("michigan");
  });

  it("strips 'College'", () => {
    const result = normalizeInstitution("MIT College of Engineering");
    expect(result).toContain("mit");
    expect(result).not.toContain("college");
  });

  it("lowercases", () => {
    expect(normalizeInstitution("HARVARD")).toBe("harvard");
  });
});

// ═══════════════════════════════════════════════════════
// calculateConfidence
// ═══════════════════════════════════════════════════════

describe("calculateConfidence", () => {
  it("base confidence is 50 with no indicators", () => {
    // nameSimilarity ≤ 0.7 → multiplier 1.0
    const result = calculateConfidence(0.5, [], []);
    expect(result).toBe(50);
  });

  it("name multiplier boosts score when similarity > 0.7", () => {
    const withBoost = calculateConfidence(0.9, [], []);
    const withoutBoost = calculateConfidence(0.5, [], []);
    expect(withBoost).toBeGreaterThan(withoutBoost);
  });

  it("each matching indicator adds 10", () => {
    const base = calculateConfidence(0.5, [], []);
    const oneMatch = calculateConfidence(0.5, ["match1"], []);
    expect(oneMatch - base).toBe(10);
  });

  it("each conflicting indicator subtracts 15", () => {
    const base = calculateConfidence(0.5, [], []);
    const oneConflict = calculateConfidence(0.5, [], ["conflict1"]);
    expect(base - oneConflict).toBe(15);
  });

  it("clamps at 100", () => {
    const result = calculateConfidence(1.0, ["m1", "m2", "m3", "m4", "m5"], []);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("clamps at 0", () => {
    const result = calculateConfidence(0, [], ["c1", "c2", "c3", "c4", "c5", "c6"]);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════
// verifyProfile — integration-level tests
// ═══════════════════════════════════════════════════════

describe("verifyProfile", () => {
  beforeEach(() => {
    // Reset env vars for consistent tests
    delete process.env.VERIFICATION_MIN_CONFIDENCE;
    delete process.env.VERIFICATION_NAME_SIMILARITY_THRESHOLD;
    delete process.env.VERIFICATION_ENABLED;
  });

  it("returns isLikelyMatch=true for an exact name match with default settings", async () => {
    const profile = {
      platform: "GitHub",
      url: "https://github.com/johnsmith",
      data: { name: "John Smith" },
    };
    const result = await verifyProfile("John Smith", profile, []);
    expect(result.isLikelyMatch).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(60);
    expect(result.verificationMethod).toBe("cross-platform-validation");
  });

  it("returns isLikelyMatch=false for a completely different name", async () => {
    const profile = {
      platform: "Instagram",
      url: "https://instagram.com/totallyunrelated",
      data: { name: "Alice Nguyen" },
    };
    const result = await verifyProfile("John Smith", profile, []);
    expect(result.isLikelyMatch).toBe(false);
    expect(result.conflictingIndicators.length).toBeGreaterThan(0);
  });

  it("includes name similarity in matchingIndicators for good name match", async () => {
    const profile = {
      platform: "LinkedIn",
      url: "https://linkedin.com/in/johnsmith",
      data: { name: "John Smith" },
    };
    const result = await verifyProfile("John Smith", profile, []);
    expect(result.matchingIndicators.some((i) => i.includes("Name match"))).toBe(true);
  });

  it("includes conflicting indicator for bad name match", async () => {
    const profile = {
      platform: "Twitter",
      url: "https://x.com/rando",
      data: { name: "Wang Wei" },
    };
    const result = await verifyProfile("Jeffrey Bernasko", profile, []);
    expect(result.conflictingIndicators.some((i) => i.includes("Name mismatch"))).toBe(true);
  });

  it("cross-references company with verified profiles", async () => {
    const verified = {
      platform: "LinkedIn",
      url: "https://linkedin.com/in/jsmith",
      data: { company: "Acme Inc", name: "John Smith" },
    };
    const newProfile = {
      platform: "GitHub",
      url: "https://github.com/jsmith",
      data: { name: "John Smith", employer: "Acme Inc" },
    };
    const result = await verifyProfile("John Smith", newProfile, [verified]);
    expect(
      result.matchingIndicators.some((i) => i.toLowerCase().includes("employment"))
    ).toBe(true);
  });

  it("cross-references location with verified profiles", async () => {
    const verified = {
      platform: "LinkedIn",
      url: "https://linkedin.com/in/jsmith",
      data: { location: "San Francisco", name: "John Smith" },
    };
    const newProfile = {
      platform: "Twitter",
      url: "https://x.com/jsmith",
      data: { name: "John Smith", location: "San Francisco" },
    };
    const result = await verifyProfile("John Smith", newProfile, [verified]);
    expect(
      result.matchingIndicators.some((i) => i.toLowerCase().includes("location"))
    ).toBe(true);
  });

  it("respects VERIFICATION_MIN_CONFIDENCE env var", async () => {
    process.env.VERIFICATION_MIN_CONFIDENCE = "90";
    // Even a good match shouldn't hit 90 with only base + name
    const profile = {
      platform: "GitHub",
      url: "https://github.com/johnsmith",
      data: { name: "John Smith" },
    };
    const result = await verifyProfile("John Smith", profile, []);
    // Confidence = (50 + 10) * 1.2 = 72, below threshold 90
    expect(result.isLikelyMatch).toBe(false);
  });

  it("handles profile with no name data gracefully", async () => {
    const profile = {
      platform: "GitHub",
      url: "https://github.com/jsmith123",
      data: {},
    };
    const result = await verifyProfile("John Smith", profile, []);
    expect(result).toHaveProperty("isLikelyMatch");
    expect(result).toHaveProperty("confidence");
    expect(result.verificationMethod).toBe("cross-platform-validation");
  });

  it("uses username as fallback display name", async () => {
    const profile = {
      platform: "GitHub",
      url: "https://github.com/johnsmith",
      username: "johnsmith",
      data: {},
    };
    const result = await verifyProfile("John Smith", profile, []);
    // "johnsmith" vs "John Smith" — partial token match should give similarity
    expect(result).toHaveProperty("confidence");
  });

  it("performance: verifies a profile in under 200ms", async () => {
    const profile = {
      platform: "GitHub",
      url: "https://github.com/jb",
      data: { name: "Jeffery Bernasko", company: "SEPTO Inc", location: "New York" },
    };
    const start = Date.now();
    await verifyProfile("Jeffery Bernasko", profile, []);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});
