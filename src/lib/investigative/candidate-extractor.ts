/**
 * Profile candidate extraction and scoring.
 *
 * Parses raw search results for known platform URL patterns, normalises URLs,
 * and produces confidence scores with explainable evidence.
 */

import type { SearchResult } from "../search/provider";
import type { ProfileCandidate } from "./models";

// ── Platform URL patterns ──────────────────────────────────────────────────────

interface PlatformPattern {
  name: string;
  /** Regex that matches a profile URL and captures the username in group 1. */
  profileUrlRegex: RegExp;
  /** Optional quick hostname check (faster than running full regex). */
  hostContains?: string;
}

export const PLATFORM_PATTERNS: PlatformPattern[] = [
  { name: "LinkedIn", profileUrlRegex: /linkedin\.com\/in\/([A-Za-z0-9_-]+)/i, hostContains: "linkedin.com" },
  { name: "GitHub", profileUrlRegex: /github\.com\/([A-Za-z0-9_-]+)(?:\/)?$/i, hostContains: "github.com" },
  { name: "X", profileUrlRegex: /(?:twitter|x)\.com\/([A-Za-z0-9_]+)(?:\/)?$/i, hostContains: ".com" },
  { name: "Instagram", profileUrlRegex: /instagram\.com\/([A-Za-z0-9_.]+)(?:\/)?$/i, hostContains: "instagram.com" },
  { name: "Facebook", profileUrlRegex: /facebook\.com\/([A-Za-z0-9_.]+)(?:\/)?$/i, hostContains: "facebook.com" },
  { name: "Reddit", profileUrlRegex: /reddit\.com\/(?:u|user)\/([A-Za-z0-9_-]+)/i, hostContains: "reddit.com" },
  { name: "Medium", profileUrlRegex: /medium\.com\/@?([A-Za-z0-9_.-]+)(?:\/)?$/i, hostContains: "medium.com" },
  { name: "YouTube", profileUrlRegex: /youtube\.com\/(?:@|channel\/)([A-Za-z0-9_.-]+)/i, hostContains: "youtube.com" },
  { name: "TikTok", profileUrlRegex: /tiktok\.com\/@([A-Za-z0-9_.]+)/i, hostContains: "tiktok.com" },
  { name: "Twitch", profileUrlRegex: /twitch\.tv\/([A-Za-z0-9_]+)(?:\/)?$/i, hostContains: "twitch.tv" },
  { name: "Dev.to", profileUrlRegex: /dev\.to\/([A-Za-z0-9_-]+)(?:\/)?$/i, hostContains: "dev.to" },
  { name: "Behance", profileUrlRegex: /behance\.net\/([A-Za-z0-9_-]+)(?:\/)?$/i, hostContains: "behance.net" },
  { name: "Pinterest", profileUrlRegex: /pinterest\.com\/([A-Za-z0-9_-]+)(?:\/)?$/i, hostContains: "pinterest.com" },
  { name: "Snapchat", profileUrlRegex: /snapchat\.com\/add\/([A-Za-z0-9_.-]+)/i, hostContains: "snapchat.com" },
  { name: "Dribbble", profileUrlRegex: /dribbble\.com\/([A-Za-z0-9_-]+)(?:\/)?$/i, hostContains: "dribbble.com" },
  { name: "SoundCloud", profileUrlRegex: /soundcloud\.com\/([A-Za-z0-9_-]+)(?:\/)?$/i, hostContains: "soundcloud.com" },
  { name: "Mastodon", profileUrlRegex: /mastodon\.social\/@([A-Za-z0-9_]+)/i, hostContains: "mastodon.social" },
  { name: "Threads", profileUrlRegex: /threads\.net\/@([A-Za-z0-9_.]+)/i, hostContains: "threads.net" },
  { name: "Quora", profileUrlRegex: /quora\.com\/profile\/([A-Za-z0-9_-]+)/i, hostContains: "quora.com" },
  { name: "Stack Overflow", profileUrlRegex: /stackoverflow\.com\/users\/\d+\/([A-Za-z0-9_-]+)/i, hostContains: "stackoverflow.com" },
  { name: "Telegram", profileUrlRegex: /t\.me\/([A-Za-z0-9_]+)/i, hostContains: "t.me" },
];

/**
 * Extract the username from a URL using the platform patterns.
 * Returns null if the URL does not match any known platform profile pattern.
 */
export function extractUsernameFromUrl(url: string): { username: string; platform: string } | null {
  // Strip query params and trailing slash for cleaner matching
  const cleanUrl = url.split(/[?#]/)[0].replace(/\/+$/, "");

  for (const pattern of PLATFORM_PATTERNS) {
    if (pattern.hostContains && !cleanUrl.toLowerCase().includes(pattern.hostContains)) {
      continue;
    }
    const match = cleanUrl.match(pattern.profileUrlRegex);
    if (match) {
      return { username: match[1], platform: pattern.name };
    }
  }
  return null;
}

/**
 * Detect the platform from a URL without extracting a username.
 * Returns "Other" for unrecognised URLs.
 */
export function detectPlatform(url: string): string {
  const result = extractUsernameFromUrl(url);
  return result ? result.platform : "Other";
}

// ── Scoring ────────────────────────────────────────────────────────────────────

interface ScoringHints {
  location?: string;
  employer?: string;
  usernameHints?: string[];
}

/**
 * Check whether a discovered username is plausibly related to the target name.
 *
 * Requires at least one name part to appear in the username for single-part names,
 * and ALL parts for multi-part names (prevents false positives like "CedricDzelu"
 * matching when searching for "Cedric Amoah").
 */
export function isUsernameRelevant(username: string, targetName: string): boolean {
  const nameParts = targetName
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length >= 2);

  if (nameParts.length === 0) return false;

  const cleaned = username.toLowerCase().replace(/[-_.]/g, "");

  // Concatenated full name (e.g. "johndoe" or "doejohn")
  const concat = nameParts.join("");
  const reversed = [...nameParts].reverse().join("");
  if (cleaned.includes(concat) || concat.includes(cleaned)) return true;
  if (cleaned.includes(reversed) || reversed.includes(cleaned)) return true;

  // Single-part name: any substring match suffices
  if (nameParts.length === 1) return cleaned.includes(nameParts[0]);

  // Multi-part name: require ALL parts
  if (nameParts.every((p) => cleaned.includes(p))) return true;

  // Initials + last name (e.g. "jdoe", "jbrown")
  const initials = nameParts.map((p) => p[0]).join("");
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts[0];
  if (cleaned.includes(initials + lastName)) return true;
  if (cleaned.includes(lastName + initials)) return true;
  if (cleaned.includes(firstName[0] + lastName)) return true;
  if (cleaned.includes(lastName + firstName[0])) return true;

  return false;
}

/**
 * Score a search result as a platform profile candidate.
 *
 * Returns a confidence value (0–1) and an ordered list of evidence reasons.
 */
export function scoreProfileCandidate(
  result: SearchResult,
  platform: string,
  username: string,
  fullName: string,
  hints: ScoringHints = {},
): { confidence: number; evidence: string[] } {
  const { title, snippet } = result;
  const combined = `${title} ${snippet}`.toLowerCase();
  const nameLower = fullName.toLowerCase();

  let score = 0;
  const evidence: string[] = [];

  // 1. Username relevance (most important signal)
  if (isUsernameRelevant(username, fullName)) {
    score += 0.35;
    evidence.push(`Username "${username}" matches name "${fullName}"`);
  }

  // 2. Full name in page title
  if (title.toLowerCase().includes(nameLower)) {
    score += 0.25;
    evidence.push(`Full name found in page title`);
  } else {
    const nameParts = nameLower.split(/\s+/);
    const partsInTitle = nameParts.filter((p) => p.length >= 2 && title.toLowerCase().includes(p));
    if (partsInTitle.length === nameParts.length) {
      score += 0.15;
      evidence.push(`All name parts found in title`);
    } else if (partsInTitle.length > 0) {
      score += 0.07;
      evidence.push(`Partial name match in title`);
    }
  }

  // 3. Full name in snippet
  if (combined.includes(nameLower)) {
    score += 0.15;
    evidence.push(`Full name found in snippet`);
  }

  // 4. Hints
  if (hints.location) {
    if (combined.includes(hints.location.toLowerCase())) {
      score += 0.1;
      evidence.push(`Location hint "${hints.location}" found in content`);
    }
  }

  if (hints.employer) {
    if (combined.includes(hints.employer.toLowerCase())) {
      score += 0.1;
      evidence.push(`Employer "${hints.employer}" found in content`);
    }
  }

  if (hints.usernameHints) {
    for (const hint of hints.usernameHints) {
      if (username.toLowerCase().includes(hint.toLowerCase())) {
        score += 0.1;
        evidence.push(`Username hint "${hint}" matches`);
        break;
      }
    }
  }

  // 5. Platform name in snippet (confirms relevance of the page)
  if (combined.includes(platform.toLowerCase())) {
    score += 0.05;
    evidence.push(`Platform name "${platform}" found in content`);
  }

  return { confidence: Math.min(score, 1), evidence };
}

/** Convert a numeric confidence score to a label. */
export function toConfidenceLabel(score: number): "high" | "medium" | "low" {
  if (score >= 0.6) return "high";
  if (score >= 0.3) return "medium";
  return "low";
}

// ── URL normalisation ─────────────────────────────────────────────────────────

/** Normalise a profile URL: remove query params, trailing slashes, and lowercase host. */
export function normaliseProfileUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return (parsed.origin + parsed.pathname).replace(/\/+$/, "").toLowerCase();
  } catch {
    return url.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
  }
}

// ── Candidate extraction ──────────────────────────────────────────────────────

/**
 * Extract and score profile candidates from raw search results.
 *
 * @param results   Raw results from a SearchProvider.
 * @param fullName  Target person's full name.
 * @param hints     Optional location / employer / username hints.
 * @param minScore  Minimum confidence to include (default: 0.1).
 */
export function extractProfileCandidates(
  results: SearchResult[],
  fullName: string,
  hints: ScoringHints = {},
  minScore = 0.1,
): ProfileCandidate[] {
  const seen = new Map<string, ProfileCandidate>(); // key: platform:username

  for (const result of results) {
    const parsed = extractUsernameFromUrl(result.url);
    if (!parsed) continue;

    const { username, platform } = parsed;
    const { confidence, evidence } = scoreProfileCandidate(result, platform, username, fullName, hints);
    if (confidence < minScore) continue;

    const key = `${platform}:${username.toLowerCase()}`;
    const existing = seen.get(key);

    // Keep the highest-confidence entry for each platform:username pair
    if (!existing || confidence > existing.confidence) {
      seen.set(key, {
        platform,
        url: normaliseProfileUrl(result.url),
        displayName: result.title.split(" | ")[0].split(" - ")[0].trim(),
        username,
        confidence,
        confidenceLabel: toConfidenceLabel(confidence),
        evidence,
        pageTitle: result.title,
        description: result.snippet,
      });
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);
}
