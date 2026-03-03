/**
 * Tiered Watchdog Validation Pipeline
 *
 * Three-tier strategy:
 *   Tier 1 — Quick  : Reject obvious false positives in < 100 ms
 *   Tier 2 — Collect: Buffer survivors for deep validation
 *   Tier 3 — Deep   : Full cross-validation against all candidates
 */

import { quickValidation, verifyProfile } from "./tools/profile-verification";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ValidationMetrics {
  totalInput: number;
  tier1Passed: number;
  tier1Rejected: number;
  tier1PassRate: number;
  tier2CandidateCount: number;
  tier3Accepted: number;
  tier3Rejected: number;
  tier3AcceptanceRate: number;
  latencyMs: {
    tier1: number;
    tier3: number;
    total: number;
  };
}

export interface TieredValidationResult {
  verified: any[];
  rejected: Array<{ profile: any; reason: string; confidence: number }>;
  metrics: ValidationMetrics;
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

/**
 * Run the three-tier validation pipeline.
 *
 * @param target   - Investigation target name.
 * @param profiles - Raw candidate profiles collected by OSINT agent.
 * @param context  - Optional known context for Tier-3 deep validation.
 */
export async function runTieredValidation(
  target: string,
  profiles: any[],
  context?: {
    knownLocations?: string[];
    knownEmployers?: string[];
    knownUsernames?: string[];
  }
): Promise<TieredValidationResult> {
  const totalStart = Date.now();

  const rejected: TieredValidationResult["rejected"] = [];
  const metrics: ValidationMetrics = {
    totalInput: profiles.length,
    tier1Passed: 0,
    tier1Rejected: 0,
    tier1PassRate: 0,
    tier2CandidateCount: 0,
    tier3Accepted: 0,
    tier3Rejected: 0,
    tier3AcceptanceRate: 0,
    latencyMs: { tier1: 0, tier3: 0, total: 0 },
  };

  // ── Tier 1: Quick filter ──────────────────────────────────────────────────
  const tier1Start = Date.now();
  const tier1Candidates: any[] = [];

  for (const profile of profiles) {
    if (quickValidation(profile, target)) {
      tier1Candidates.push(profile);
    } else {
      rejected.push({
        profile,
        reason: "Tier-1 quick reject: username unrelated to target name",
        confidence: 0,
      });
    }
  }

  metrics.tier1Passed = tier1Candidates.length;
  metrics.tier1Rejected = profiles.length - tier1Candidates.length;
  // Return 0 (not 100) when no profiles are processed so callers can distinguish
  // "all passed" from "nothing was provided".
  metrics.tier1PassRate =
    profiles.length > 0 ? (tier1Candidates.length / profiles.length) * 100 : 0;
  metrics.latencyMs.tier1 = Date.now() - tier1Start;

  console.log(
    `🔍 Tier-1: ${metrics.tier1Passed} passed, ${metrics.tier1Rejected} rejected (${metrics.tier1PassRate.toFixed(1)}% pass rate, ${metrics.latencyMs.tier1}ms)`
  );

  // ── Tier 2: Collect survivors ─────────────────────────────────────────────
  const tier2Candidates = [...tier1Candidates];
  metrics.tier2CandidateCount = tier2Candidates.length;

  // ── Tier 3: Deep validation ───────────────────────────────────────────────
  const tier3Start = Date.now();
  const verified: any[] = [];

  // Build known-usernames list from highest-confidence candidates for cross-validation
  const knownUsernames =
    context?.knownUsernames ??
    tier2Candidates
      .filter((p) => p.confidence === "high" || p.confidence === "medium")
      .map((p) => p.username)
      .filter(Boolean);

  const deepContext = {
    ...(context ?? {}),
    knownUsernames,
  };

  for (const profile of tier2Candidates) {
    const result = verifyProfile(profile, target, deepContext);
    if (result.accepted) {
      verified.push({
        ...profile,
        verificationConfidence: result.confidence,
        verificationReasoning: result.reasoning,
      });
    } else {
      rejected.push({
        profile,
        reason: result.reasoning,
        confidence: result.confidence,
      });
    }
  }

  metrics.tier3Accepted = verified.length;
  metrics.tier3Rejected = tier2Candidates.length - verified.length;
  // Return 0 (not 100) when no candidates — same rationale as tier1PassRate.
  metrics.tier3AcceptanceRate =
    tier2Candidates.length > 0
      ? (verified.length / tier2Candidates.length) * 100
      : 0;
  metrics.latencyMs.tier3 = Date.now() - tier3Start;
  metrics.latencyMs.total = Date.now() - totalStart;

  console.log(
    `🔍 Tier-3: ${metrics.tier3Accepted} accepted, ${metrics.tier3Rejected} rejected (${metrics.tier3AcceptanceRate.toFixed(1)}% acceptance rate, ${metrics.latencyMs.tier3}ms)`
  );

  return { verified, rejected, metrics };
}

/**
 * Build a verification summary suitable for attaching to investigation results.
 */
export function buildVerificationSummary(result: TieredValidationResult): {
  totalScanned: number;
  verified: number;
  rejected: number;
  falsePositiveRate: number;
} {
  const totalScanned = result.metrics.totalInput;
  const verifiedCount = result.verified.length;
  const rejectedCount = result.rejected.length;
  const falsePositiveRate =
    totalScanned > 0
      ? Math.round((rejectedCount / totalScanned) * 100 * 10) / 10
      : 0;

  return {
    totalScanned,
    verified: verifiedCount,
    rejected: rejectedCount,
    falsePositiveRate,
  };
}
