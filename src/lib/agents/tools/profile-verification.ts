/**
 * Profile Verification Module
 * Cross-validates collected profiles against a target name to reduce false positives.
 */

import { computeNameSimilarity } from "../utils/name-similarity";

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

export interface VerificationResult {
  isLikelyMatch: boolean;
  confidence: number; // 0–100
  matchingIndicators: string[];
  conflictingIndicators: string[];
  reasoning: string;
  verificationMethod: "cross-platform-validation";
}

// ═══════════════════════════════════════════════════════
// Normalization helpers
// ═══════════════════════════════════════════════════════

/** Normalize a location string for comparison. */
export function normalizeLocation(loc: string): string {
  return loc
    .toLowerCase()
    .replace(/[,.-]/g, "")
    .replace(/\b(city|state|province|country|region|area)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize a company name for comparison. */
export function normalizeCompany(company: string): string {
  return company
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co|group|holdings|international)\b\.?/g, "")
    .replace(/[,.-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize an education / institution name for comparison. */
export function normalizeInstitution(institution: string): string {
  return institution
    .toLowerCase()
    .replace(/\b(university|college|institute|school|of|the|and)\b/g, "")
    .replace(/[,.-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ═══════════════════════════════════════════════════════
// Cross-validation helpers
// ═══════════════════════════════════════════════════════

/** Extract possible social-media links from a profile's data/bio fields. */
function extractSocialLinks(profile: any): string[] {
  const links: string[] = [];
  const text = JSON.stringify(profile.data || {}) + " " + (profile.url || "");
  const urlRegex = /https?:\/\/[^\s"'<>]+/g;
  const matches = text.match(urlRegex) || [];
  const socialHosts = [
    "github.com",
    "x.com",
    "twitter.com",
    "linkedin.com",
    "instagram.com",
    "facebook.com",
    "tiktok.com",
  ];
  for (const m of matches) {
    try {
      const hostname = new URL(m).hostname.toLowerCase();
      if (socialHosts.some((h) => hostname === h || hostname.endsWith("." + h))) {
        links.push(m);
      }
    } catch {
      // skip malformed URLs
    }
  }
  return links;
}

/** Pull company names out of a profile's data object. */
function extractCompanies(profile: any): string[] {
  const data = profile.data;
  if (!data || typeof data !== "object") return [];
  const fields = ["company", "employer", "organization", "work", "workplace", "experience"];
  const companies: string[] = [];
  for (const f of fields) {
    const val = data[f];
    if (typeof val === "string" && val.trim()) companies.push(val.trim());
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "string") companies.push(item.trim());
        else if (item && typeof item === "object" && typeof item.name === "string") companies.push(item.name.trim());
      }
    }
  }
  return companies;
}

/** Pull location strings out of a profile's data object. */
function extractLocations(profile: any): string[] {
  const data = profile.data;
  if (!data || typeof data !== "object") return [];
  const fields = ["location", "city", "country", "address", "region"];
  const locs: string[] = [];
  for (const f of fields) {
    const val = data[f];
    if (typeof val === "string" && val.trim()) locs.push(val.trim());
  }
  return locs;
}

/** Pull education / institution names out of a profile's data object. */
function extractInstitutions(profile: any): string[] {
  const data = profile.data;
  if (!data || typeof data !== "object") return [];
  const fields = ["education", "school", "university", "college", "institution"];
  const insts: string[] = [];
  for (const f of fields) {
    const val = data[f];
    if (typeof val === "string" && val.trim()) insts.push(val.trim());
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "string") insts.push(item.trim());
        else if (item && typeof item === "object" && typeof item.name === "string") insts.push(item.name.trim());
      }
    }
  }
  return insts;
}

// ═══════════════════════════════════════════════════════
// Confidence calculation
// ═══════════════════════════════════════════════════════

/**
 * Apply the confidence scoring formula from the PRD:
 *
 * baseConfidence = 50
 * matchBonus = matchingIndicators.length * 10
 * conflictPenalty = conflictingIndicators.length * 15
 * nameMultiplier = nameSimilarity > 0.7 ? 1.2 : 1.0
 *
 * finalConfidence = clamp(0, 100,
 *   (baseConfidence + matchBonus - conflictPenalty) * nameMultiplier
 * )
 */
export function calculateConfidence(
  nameSimilarity: number,
  matchingIndicators: string[],
  conflictingIndicators: string[]
): number {
  const baseConfidence = 50;
  const matchBonus = matchingIndicators.length * 10;
  const conflictPenalty = conflictingIndicators.length * 15;
  const nameMultiplier = nameSimilarity > 0.7 ? 1.2 : 1.0;

  const raw =
    (baseConfidence + matchBonus - conflictPenalty) * nameMultiplier;

  return Math.min(100, Math.max(0, Math.round(raw)));
}

// ═══════════════════════════════════════════════════════
// Main verification function
// ═══════════════════════════════════════════════════════

/**
 * Verify whether `profile` likely belongs to `targetName`.
 *
 * @param targetName        The name being investigated.
 * @param profile           A collected social profile object.
 * @param verifiedProfiles  Already-verified profiles to cross-reference against.
 * @returns                 A VerificationResult.
 */
export async function verifyProfile(
  targetName: string,
  profile: any,
  verifiedProfiles: any[]
): Promise<VerificationResult> {
  const matchingIndicators: string[] = [];
  const conflictingIndicators: string[] = [];

  // ── 1. Name Similarity (Weight: 40%) ──────────────────
  const profileName: string =
    profile.data?.name ||
    profile.data?.fullName ||
    profile.data?.displayName ||
    profile.username ||
    "";

  const nameSimilarity = profileName
    ? computeNameSimilarity(targetName, profileName)
    : 0;

  const NAME_THRESHOLD = Number(process.env.VERIFICATION_NAME_SIMILARITY_THRESHOLD) || 0.7;

  if (profileName) {
    if (nameSimilarity >= NAME_THRESHOLD) {
      matchingIndicators.push(
        `Name match: "${profileName}" ≈ "${targetName}" (similarity: ${nameSimilarity.toFixed(2)})`
      );
    } else {
      conflictingIndicators.push(
        `Name mismatch: "${profileName}" vs "${targetName}" (similarity: ${nameSimilarity.toFixed(2)})`
      );
    }
  }

  // ── 2. Location Consistency (Weight: 20%) ────────────
  const profileLocations = extractLocations(profile);
  if (profileLocations.length > 0 && verifiedProfiles.length > 0) {
    const normProfileLocs = profileLocations.map(normalizeLocation);

    for (const verified of verifiedProfiles) {
      const verifiedLocs = extractLocations(verified).map(normalizeLocation);
      const hasMatch = normProfileLocs.some((l) =>
        verifiedLocs.some((vl) => vl === l || vl.includes(l) || l.includes(vl))
      );

      if (hasMatch) {
        matchingIndicators.push(
          `Location consistent with verified profile (${verified.platform})`
        );
        break;
      } else if (verifiedLocs.length > 0) {
        conflictingIndicators.push(
          `Location conflict with verified profile (${verified.platform}): ${profileLocations[0]} vs ${extractLocations(verified)[0]}`
        );
        break;
      }
    }
  }

  // ── 3. Employment Cross-Check (Weight: 20%) ──────────
  const profileCompanies = extractCompanies(profile).map(normalizeCompany).filter(Boolean);
  if (profileCompanies.length > 0 && verifiedProfiles.length > 0) {
    for (const verified of verifiedProfiles) {
      const verifiedCompanies = extractCompanies(verified).map(normalizeCompany).filter(Boolean);
      const hasMatch = profileCompanies.some((c) =>
        verifiedCompanies.some((vc) => vc === c || vc.includes(c) || c.includes(vc))
      );

      if (hasMatch) {
        matchingIndicators.push(
          `Employment match with verified profile (${verified.platform})`
        );
        break;
      }
    }
  }

  // ── 4. Education Cross-Check (Weight: 10%) ────────────
  const profileInsts = extractInstitutions(profile).map(normalizeInstitution).filter(Boolean);
  if (profileInsts.length > 0 && verifiedProfiles.length > 0) {
    for (const verified of verifiedProfiles) {
      const verifiedInsts = extractInstitutions(verified).map(normalizeInstitution).filter(Boolean);
      const hasMatch = profileInsts.some((i) =>
        verifiedInsts.some((vi) => vi === i || vi.includes(i) || i.includes(vi))
      );

      if (hasMatch) {
        matchingIndicators.push(
          `Education match with verified profile (${verified.platform})`
        );
        break;
      }
    }
  }

  // ── 5. Cross-Platform Links (Weight: 10%) ────────────
  const profileLinks = extractSocialLinks(profile);
  if (profileLinks.length > 0 && verifiedProfiles.length > 0) {
    for (const verified of verifiedProfiles) {
      const verifiedUrl = (verified.url || "").toLowerCase();
      const hasLink = profileLinks.some((link) =>
        link.toLowerCase().includes(verifiedUrl) || verifiedUrl.includes(link.toLowerCase())
      );
      if (hasLink) {
        matchingIndicators.push(
          `Cross-platform link found pointing to verified profile (${verified.platform})`
        );
        break;
      }
    }
  }

  // ── Confidence & Decision ─────────────────────────────
  const confidence = calculateConfidence(
    nameSimilarity,
    matchingIndicators,
    conflictingIndicators
  );

  const minConfidence = Number(process.env.VERIFICATION_MIN_CONFIDENCE) || 60;
  const isLikelyMatch = confidence >= minConfidence;

  // Build human-readable reasoning
  const reasonParts: string[] = [];
  if (matchingIndicators.length > 0) {
    reasonParts.push(`Matching: ${matchingIndicators.join("; ")}`);
  }
  if (conflictingIndicators.length > 0) {
    reasonParts.push(`Conflicts: ${conflictingIndicators.join("; ")}`);
  }
  if (reasonParts.length === 0) {
    reasonParts.push("No cross-validation data available; decision based on base confidence only");
  }

  return {
    isLikelyMatch,
    confidence,
    matchingIndicators,
    conflictingIndicators,
    reasoning: reasonParts.join(" | "),
    verificationMethod: "cross-platform-validation",
  };
}
