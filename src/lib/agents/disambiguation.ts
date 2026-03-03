/**
 * Disambiguation Module
 *
 * When multiple high-confidence profile matches are found for a target,
 * this module extracts the top candidates and returns a structured
 * disambiguation request so the user (or API caller) can clarify which
 * individual is the actual subject of the investigation.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DisambiguationCandidate {
  name: string;
  location?: string;
  employer?: string;
  platforms: string[];
  confidence: number;
}

export interface DisambiguationRequest {
  needsUserInput: true;
  candidates: DisambiguationCandidate[];
  /** Partial findings gathered so far — returned to the caller for transparency. */
  partialResults: any;
}

// ── Confidence score mapping ──────────────────────────────────────────────────

const HIGH_CONFIDENCE_SCORE = 90;
const MEDIUM_CONFIDENCE_SCORE = 60;
const LOW_CONFIDENCE_SCORE = 30;

// ── Candidate extraction ──────────────────────────────────────────────────────

/**
 * Build up to `maxCandidates` disambiguation candidates from raw profiles.
 * Groups profiles by probable individual using location / employer signals.
 */
export function buildDisambiguationCandidates(
  profiles: Array<{
    platform: string;
    url: string;
    username?: string;
    confidence?: string;
    verificationConfidence?: number;
    data?: Record<string, any>;
  }>,
  targetName: string,
  maxCandidates = 3
): DisambiguationCandidate[] {
  // Group by (location, employer) tuple as a simple disambiguation key
  type Group = {
    location?: string;
    employer?: string;
    platforms: string[];
    confidenceSum: number;
    count: number;
  };

  const groups = new Map<string, Group>();

  for (const profile of profiles) {
    const location =
      typeof profile.data?.location === "string"
        ? profile.data.location.trim()
        : undefined;
    const employer =
      typeof profile.data?.company === "string"
        ? profile.data.company.trim()
        : typeof profile.data?.employer === "string"
        ? profile.data.employer.trim()
        : undefined;

    const key = `${location ?? ""}|${employer ?? ""}`;
    const existing = groups.get(key);
    const conf =
      profile.verificationConfidence ??
      (profile.confidence === "high" ? HIGH_CONFIDENCE_SCORE :
       profile.confidence === "medium" ? MEDIUM_CONFIDENCE_SCORE : LOW_CONFIDENCE_SCORE);

    if (existing) {
      if (!existing.platforms.includes(profile.platform)) {
        existing.platforms.push(profile.platform);
      }
      existing.confidenceSum += conf;
      existing.count += 1;
    } else {
      groups.set(key, {
        location,
        employer,
        platforms: [profile.platform],
        confidenceSum: conf,
        count: 1,
      });
    }
  }

  const candidates: DisambiguationCandidate[] = Array.from(groups.values())
    .map((g) => ({
      name: targetName,
      location: g.location,
      employer: g.employer,
      platforms: g.platforms,
      confidence: Math.round(g.confidenceSum / g.count),
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxCandidates);

  // Always return at least one candidate (the target itself)
  if (candidates.length === 0) {
    candidates.push({
      name: targetName,
      platforms: profiles.map((p) => p.platform),
      confidence: 50,
    });
  }

  return candidates;
}

/**
 * Return a structured disambiguation request when the overall confidence is
 * below the configured threshold or when multiple distinct individuals are found.
 */
export function createDisambiguationRequest(
  candidates: DisambiguationCandidate[],
  partialResults: any
): DisambiguationRequest {
  return {
    needsUserInput: true,
    candidates,
    partialResults,
  };
}
