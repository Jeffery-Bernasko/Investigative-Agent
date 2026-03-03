/**
 * Profile Verification Tool
 *
 * Reduces false positives by cross-validating collected profiles against
 * the known target using:
 *   • Levenshtein name-similarity
 *   • Location consistency
 *   • Employment / education cross-checks
 *   • Cross-platform link verification
 *   • Username pattern consistency
 */

import { VERIFICATION_CONFIG, TIER1_QUICK_REJECT_THRESHOLD } from "../config";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProfileVerificationResult {
  /** 0–100 overall confidence that this profile belongs to the target. */
  confidence: number;
  matchingIndicators: string[];
  conflictingIndicators: string[];
  /** Human-readable explanation (LLM-free, rule-based). */
  reasoning: string;
  /** Whether the profile passed the minimum confidence threshold. */
  accepted: boolean;
}

// ── Levenshtein distance ──────────────────────────────────────────────────────

/**
 * Compute the Levenshtein edit distance between two strings.
 * O(n·m) time, O(min(n,m)) space.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Use a rolling two-row DP to save memory
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,       // insertion
        prev[j] + 1,           // deletion
        prev[j - 1] + cost     // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/**
 * Convert Levenshtein distance to a 0–100 similarity score.
 */
export function nameSimilarityScore(a: string, b: string): number {
  const normalizedA = a.toLowerCase().trim();
  const normalizedB = b.toLowerCase().trim();
  const maxLen = Math.max(normalizedA.length, normalizedB.length);
  if (maxLen === 0) return 100;
  const dist = levenshteinDistance(normalizedA, normalizedB);
  return Math.round(((maxLen - dist) / maxLen) * 100);
}

// ── Username pattern check ────────────────────────────────────────────────────

function usernameMatchesTarget(username: string, targetName: string): boolean {
  const nameParts = targetName.toLowerCase().split(/\s+/).filter((p) => p.length >= 2);
  const cleaned = username.toLowerCase().replace(/[-_.]/g, "");
  return nameParts.some((part) => cleaned.includes(part));
}

// ── Quick / Tier-1 validation ─────────────────────────────────────────────────

/**
 * Tier-1: Fast reject for obvious false positives.
 * Returns `true` if the profile *passes* the quick check (< 100ms target).
 */
export function quickValidation(
  profile: { platform: string; url: string; username?: string; confidence?: string },
  targetName: string
): boolean {
  // Reject profiles where the extracted username has near-zero name similarity.
  // The threshold is exclusive: scores strictly below TIER1_QUICK_REJECT_THRESHOLD are rejected.
  const username = profile.username ?? extractUsernameFromUrl(profile.url);
  if (!username) return true; // Cannot determine — pass to Tier 3

  const sim = nameSimilarityScore(username, targetName.replace(/\s+/g, ""));
  // sim < threshold (exclusive) AND no partial name match → fast reject
  if (sim < TIER1_QUICK_REJECT_THRESHOLD && !usernameMatchesTarget(username, targetName)) {
    return false;
  }
  return true;
}

function extractUsernameFromUrl(url: string): string | null {
  const patterns = [
    /github\.com\/([A-Za-z0-9_-]+)/i,
    /(?:twitter|x)\.com\/([A-Za-z0-9_]+)/i,
    /instagram\.com\/([A-Za-z0-9_.]+)/i,
    /linkedin\.com\/in\/([A-Za-z0-9_-]+)/i,
    /facebook\.com\/([A-Za-z0-9_.]+)/i,
    /reddit\.com\/user\/([A-Za-z0-9_-]+)/i,
    /medium\.com\/@?([A-Za-z0-9_.-]+)/i,
  ];
  for (const rx of patterns) {
    const m = url.match(rx);
    if (m) return m[1];
  }
  return null;
}

// ── Full / Tier-3 validation ──────────────────────────────────────────────────

/**
 * Full profile verification.
 *
 * @param profile  - The candidate profile to verify.
 * @param target   - The investigation target name.
 * @param context  - Optional additional signals (location, employer, …).
 */
export function verifyProfile(
  profile: {
    platform: string;
    url: string;
    username?: string;
    confidence?: string;
    data?: Record<string, any>;
  },
  target: string,
  context?: {
    knownLocations?: string[];
    knownEmployers?: string[];
    knownUsernames?: string[];
  }
): ProfileVerificationResult {
  const matching: string[] = [];
  const conflicting: string[] = [];
  let rawScore = 0;

  const threshold = VERIFICATION_CONFIG.strictMode ? 80 : VERIFICATION_CONFIG.minimumConfidence;

  const username = profile.username ?? extractUsernameFromUrl(profile.url) ?? "";

  // ── Name indicator (weight 0.4) ──
  const nameSim = username
    ? Math.max(
        nameSimilarityScore(username, target.replace(/\s+/g, "")),
        nameSimilarityScore(username, target)
      )
    : 0;

  if (usernameMatchesTarget(username, target)) {
    matching.push(`Username "${username}" matches target name pattern`);
    rawScore += VERIFICATION_CONFIG.indicators.name.weight * 100;
  } else if (nameSim >= 60) {
    matching.push(`Username "${username}" is similar to target (${nameSim}% similarity)`);
    rawScore += VERIFICATION_CONFIG.indicators.name.weight * nameSim;
  } else if (nameSim < 30 && username.length > 2) {
    conflicting.push(`Username "${username}" appears unrelated to target (${nameSim}% similarity)`);
    rawScore += VERIFICATION_CONFIG.indicators.name.weight * nameSim * 0.5;
  } else {
    // Neutral — partial credit
    rawScore += VERIFICATION_CONFIG.indicators.name.weight * nameSim;
  }

  // ── Location indicator (weight 0.2) ──
  if (context?.knownLocations && context.knownLocations.length > 0) {
    const profileLocation = profile.data?.location ?? profile.data?.bio ?? "";
    const locationStr = typeof profileLocation === "string" ? profileLocation.toLowerCase() : "";
    const match = context.knownLocations.some((loc) => locationStr.includes(loc.toLowerCase()));
    if (match) {
      matching.push("Location matches known target location");
      rawScore += VERIFICATION_CONFIG.indicators.location.weight * 100;
    } else if (locationStr) {
      conflicting.push("Location does not match known target location");
    } else {
      rawScore += VERIFICATION_CONFIG.indicators.location.weight * 50; // unknown → neutral
    }
  } else {
    rawScore += VERIFICATION_CONFIG.indicators.location.weight * 50;
  }

  // ── Employment indicator (weight 0.2) ──
  if (context?.knownEmployers && context.knownEmployers.length > 0) {
    const profileBio = typeof profile.data?.bio === "string" ? profile.data.bio.toLowerCase() : "";
    const match = context.knownEmployers.some((emp) => profileBio.includes(emp.toLowerCase()));
    if (match) {
      matching.push("Employment/bio mention matches known employer");
      rawScore += VERIFICATION_CONFIG.indicators.employment.weight * 100;
    } else {
      rawScore += VERIFICATION_CONFIG.indicators.employment.weight * 50;
    }
  } else {
    rawScore += VERIFICATION_CONFIG.indicators.employment.weight * 50;
  }

  // ── Cross-platform link indicator (weight 0.2) ──
  if (context?.knownUsernames && context.knownUsernames.length > 0) {
    const profileText = JSON.stringify(profile.data ?? "").toLowerCase();
    const crossMatch = context.knownUsernames.some((u) => profileText.includes(u.toLowerCase()));
    if (crossMatch) {
      matching.push("Profile cross-references a known username");
      rawScore += VERIFICATION_CONFIG.indicators.links.weight * 100;
    } else {
      rawScore += VERIFICATION_CONFIG.indicators.links.weight * 50;
    }
  } else {
    rawScore += VERIFICATION_CONFIG.indicators.links.weight * 50;
  }

  // ── Boost for high-confidence source ──
  if (profile.confidence === "high") {
    rawScore = Math.min(100, rawScore + 10);
    matching.push("Source confidence: high");
  }

  const confidence = Math.round(Math.min(100, Math.max(0, rawScore)));
  const accepted = confidence >= threshold;

  const reasoningParts: string[] = [
    `Confidence: ${confidence}/100 (threshold: ${threshold}).`,
    matching.length > 0 ? `Matches: ${matching.join("; ")}.` : "No positive matches.",
    conflicting.length > 0 ? `Conflicts: ${conflicting.join("; ")}.` : "",
    accepted ? "Profile accepted." : "Profile rejected — below minimum confidence threshold.",
  ];

  return {
    confidence,
    matchingIndicators: matching,
    conflictingIndicators: conflicting,
    reasoning: reasoningParts.filter(Boolean).join(" "),
    accepted,
  };
}
