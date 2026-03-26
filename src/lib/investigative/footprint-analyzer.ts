/**
 * Digital footprint analysis.
 *
 * Derives a structured FootprintAnalysis from discovered profiles,
 * websites, and search snippets.
 */

import type { ProfileCandidate, WebsiteCandidate, FootprintAnalysis } from "./models";
import { redactPii } from "./pii-redaction";

/** Classify a platform into a category for breadth assessment. */
function platformCategory(platform: string): "social" | "professional" | "tech" | "media" {
  const lower = platform.toLowerCase();
  if (["linkedin"].includes(lower)) return "professional";
  if (["github", "dev.to", "stack overflow", "stackoverflow"].includes(lower)) return "tech";
  if (["youtube", "twitch", "soundcloud", "spotify"].includes(lower)) return "media";
  return "social";
}

function deriveBreadth(
  platformCount: number,
): FootprintAnalysis["presence"]["breadth"] {
  if (platformCount >= 8) return "extensive";
  if (platformCount >= 4) return "moderate";
  if (platformCount >= 2) return "limited";
  return "minimal";
}

function breadthDescription(breadth: string, count: number): string {
  switch (breadth) {
    case "extensive":
      return `The target maintains an extensive online presence across ${count} platforms, indicating high digital visibility.`;
    case "moderate":
      return `The target has a moderate online presence across ${count} platforms.`;
    case "limited":
      return `The target has a limited online presence, found on only ${count} platform(s).`;
    default:
      return `The target has a minimal discoverable online presence (${count} platform(s)).`;
  }
}

/** Assess identity consistency across discovered profiles. */
function assessIdentityConsistency(
  profiles: ProfileCandidate[],
): FootprintAnalysis["identityConsistency"] {
  const usernames = Array.from(
    new Set(profiles.map((p) => p.username).filter(Boolean)),
  );

  const displayNames = Array.from(
    new Set(profiles.map((p) => p.displayName).filter(Boolean)),
  );

  // Check whether all display names share a common root (case-insensitive)
  let nameConsistent = true;
  if (displayNames.length > 1) {
    const root = displayNames[0].toLowerCase().replace(/[^a-z]/g, "");
    nameConsistent = displayNames.every((n) =>
      n.toLowerCase().replace(/[^a-z]/g, "").includes(root) ||
      root.includes(n.toLowerCase().replace(/[^a-z]/g, "")),
    );
  }

  let consistencyLevel: FootprintAnalysis["identityConsistency"]["consistencyLevel"] =
    "consistent";
  let notes = "Username and display names appear consistent across platforms.";

  if (usernames.length > 3) {
    consistencyLevel = "significant_variations";
    notes = `Multiple username variants found (${usernames.slice(0, 5).join(", ")}), which may indicate organic growth, rebranding, or impersonation.`;
  } else if (usernames.length > 1) {
    consistencyLevel = "minor_variations";
    notes = `Minor username variations detected (${usernames.join(", ")}). This is common when preferred usernames are taken.`;
  }

  return {
    nameConsistent,
    usernameVariants: usernames,
    consistencyLevel,
    notes,
  };
}

/** Derive risk signals from profiles, websites, and snippets. */
function deriveRiskSignals(
  profiles: ProfileCandidate[],
  websites: WebsiteCandidate[],
  snippets: string[],
): FootprintAnalysis["riskSignals"] {
  const signals: FootprintAnalysis["riskSignals"] = [];

  const allText = snippets.join(" ").toLowerCase();

  // High social footprint
  if (profiles.length >= 8) {
    signals.push({
      signal: "High platform presence",
      severity: "medium",
      description: `Presence on ${profiles.length} platforms significantly increases the attack surface for social engineering and phishing.`,
    });
  }

  // Email-like patterns in snippets
  const emailPattern = /\b[\w.+-]{1,40}@[\w-]{1,30}\.[a-z]{2,6}\b/i;
  if (emailPattern.test(allText)) {
    signals.push({
      signal: "Email address in public search snippets",
      severity: "high",
      description: "One or more email addresses appear in public search result snippets, increasing phishing risk.",
    });
  }

  // Phone-like patterns
  const phonePattern = /\b(\+?\d[\d\s\-().]{7,17})\b/;
  if (phonePattern.test(allText)) {
    signals.push({
      signal: "Phone number in public search snippets",
      severity: "high",
      description: "A phone number was detected in publicly accessible content.",
    });
  }

  // Low confidence profiles (potential impersonation)
  const lowConfidence = profiles.filter((p) => p.confidence < 0.3);
  if (lowConfidence.length > 0) {
    signals.push({
      signal: "Low-confidence profile matches",
      severity: "low",
      description: `${lowConfidence.length} profile(s) matched with low confidence — these may represent different individuals or impersonators.`,
    });
  }

  // No professional profile
  const hasProfessional = profiles.some(
    (p) => platformCategory(p.platform) === "professional",
  );
  if (profiles.length > 0 && !hasProfessional) {
    signals.push({
      signal: "No professional profile detected",
      severity: "low",
      description: "No LinkedIn or professional network profile was found, which may limit background verification options.",
    });
  }

  return signals;
}

/** Check for possible impersonation or duplicate accounts. */
function checkImpersonation(
  profiles: ProfileCandidate[],
): FootprintAnalysis["impersonationChecks"] {
  const details: string[] = [];

  // Multiple profiles on the same platform
  const platformCounts = new Map<string, number>();
  for (const p of profiles) {
    platformCounts.set(p.platform, (platformCounts.get(p.platform) || 0) + 1);
  }
  for (const [platform, count] of platformCounts.entries()) {
    if (count > 1) {
      details.push(
        `Multiple profiles found on ${platform} (${count} accounts) — possible duplicate or impersonation.`,
      );
    }
  }

  return { flagged: details.length > 0, details };
}

/** Detect and (by default) redact sensitive PII from snippets. */
function detectSensitiveExposure(
  snippets: string[],
  includeRawPii = false,
): FootprintAnalysis["sensitiveExposure"] {
  const items: string[] = [];
  const allText = snippets.join("\n");

  // Email addresses
  const emails = allText.match(/\b[\w.+-]{1,40}@[\w-]{1,30}\.[a-z]{2,6}\b/gi) || [];
  for (const email of Array.from(new Set(emails)).slice(0, 5)) {
    items.push(includeRawPii ? `Email: ${email}` : `Email: ${redactPii(email, "email")}`);
  }

  // Phone numbers
  const phones =
    allText.match(/\b(\+?\d[\d\s\-().]{7,17})\b/g)?.filter((p) => p.replace(/\D/g, "").length >= 7) || [];
  for (const phone of Array.from(new Set(phones)).slice(0, 3)) {
    items.push(
      includeRawPii ? `Phone: ${phone}` : `Phone: ${redactPii(phone, "phone")}`,
    );
  }

  return {
    found: items.length > 0,
    items,
    cautionNote:
      items.length > 0
        ? "⚠️ Potentially sensitive personal information was found in public search results. Sensitive fields are redacted by default. Set includeRawPii=true to expose full values."
        : "No directly exposed PII (email/phone) was detected in search snippets.",
  };
}

/** Generate plain-English recommendations based on findings. */
function generateRecommendations(
  analysis: Pick<FootprintAnalysis, "presence" | "riskSignals" | "sensitiveExposure" | "impersonationChecks">,
): string[] {
  const recs: string[] = [];

  if (analysis.sensitiveExposure.found) {
    recs.push(
      "Remove or request removal of exposed contact information (email/phone) from public search indexes.",
    );
  }

  if (analysis.riskSignals.some((r) => r.signal.includes("email"))) {
    recs.push(
      "Consider using a separate alias email for public/professional profiles to reduce phishing risk.",
    );
  }

  if (analysis.impersonationChecks.flagged) {
    recs.push(
      "Investigate duplicate accounts on the same platform — verify which are authentic and consider reporting impersonators.",
    );
  }

  if (analysis.presence.breadth === "extensive") {
    recs.push(
      "Review and prune dormant or redundant profiles to reduce attack surface.",
    );
  }

  if (analysis.presence.totalPlatforms === 0) {
    recs.push("No public profiles found. Consider establishing a minimal professional presence for reputational verification.");
  }

  // Default privacy recommendation
  recs.push(
    "Regularly audit privacy settings across all discovered platforms, ensuring only intended information is public.",
  );
  recs.push(
    "Set up Google Alerts (or equivalent) for your name to monitor new public mentions.",
  );

  return recs;
}

/**
 * Build a complete FootprintAnalysis from discovered profile and website candidates.
 *
 * @param fullName        Target person's name.
 * @param profiles        Scored profile candidates.
 * @param websites        Scored website candidates.
 * @param snippets        Raw search result snippets (used for PII detection).
 * @param includeRawPii   When true, expose unredacted PII in the report.
 */
export function buildFootprintAnalysis(
  fullName: string,
  profiles: ProfileCandidate[],
  websites: WebsiteCandidate[],
  snippets: string[],
  includeRawPii = false,
): FootprintAnalysis {
  const activePlatforms = profiles
    .filter((p) => p.confidenceLabel !== "low")
    .map((p) => p.platform);

  const presence: FootprintAnalysis["presence"] = {
    totalPlatforms: activePlatforms.length,
    activePlatforms,
    breadth: deriveBreadth(activePlatforms.length),
    breadthDescription: breadthDescription(
      deriveBreadth(activePlatforms.length),
      activePlatforms.length,
    ),
  };

  const identityConsistency = assessIdentityConsistency(profiles);
  const riskSignals = deriveRiskSignals(profiles, websites, snippets);
  const impersonationChecks = checkImpersonation(profiles);
  const sensitiveExposure = detectSensitiveExposure(snippets, includeRawPii);

  const recommendations = generateRecommendations({
    presence,
    riskSignals,
    sensitiveExposure,
    impersonationChecks,
  });

  const executiveSummary = [
    `OSINT investigation of "${fullName}" discovered ${profiles.length} potential social profile(s) across ${presence.totalPlatforms} platform(s) and ${websites.length} associated website(s).`,
    presence.breadthDescription,
    identityConsistency.notes,
    riskSignals.length > 0
      ? `${riskSignals.length} risk signal(s) identified, including: ${riskSignals.map((r) => r.signal).join("; ")}.`
      : "No significant risk signals were identified.",
    "All information was gathered from publicly available sources only.",
  ].join(" ");

  return {
    executiveSummary,
    presence,
    identityConsistency,
    riskSignals,
    impersonationChecks,
    sensitiveExposure,
    recommendations,
    limitations:
      "This analysis is based solely on publicly accessible web data gathered via OSINT techniques. " +
      "Results may be incomplete or inaccurate. No data was obtained by bypassing authentication or scraping behind logins. " +
      "Confidence scores are heuristic and should be validated by a human analyst before informing operational decisions. " +
      "Coverage is limited to platforms and search results indexed at the time of investigation.",
  };
}
