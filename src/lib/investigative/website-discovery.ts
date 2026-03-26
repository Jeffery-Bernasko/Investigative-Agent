/**
 * Website candidate extraction and scoring.
 *
 * Discovers personal sites, portfolios, blogs, and organisation sites
 * associated with a target person from search results.
 */

import type { SearchResult } from "../search/provider";
import type { WebsiteCandidate } from "./models";

// Known social / platform domains — excluded from website candidate results
const SOCIAL_PLATFORM_DOMAINS = new Set([
  "github.com",
  "x.com",
  "twitter.com",
  "instagram.com",
  "linkedin.com",
  "facebook.com",
  "reddit.com",
  "tiktok.com",
  "medium.com",
  "youtube.com",
  "twitch.tv",
  "behance.net",
  "dribbble.com",
  "soundcloud.com",
  "pinterest.com",
  "snapchat.com",
  "threads.net",
  "mastodon.social",
  "quora.com",
  "dev.to",
  "stackoverflow.com",
  "t.me",
  "telegram.org",
  "discord.com",
  "discord.gg",
  "wikipedia.org",
  "wikidata.org",
]);

// Generic authority/news sites that are unlikely personal sites
const GENERIC_AUTHORITY_DOMAINS = new Set([
  "google.com",
  "bing.com",
  "yahoo.com",
  "amazon.com",
  "apple.com",
  "microsoft.com",
  "nytimes.com",
  "theguardian.com",
  "bbc.com",
  "cnn.com",
  "forbes.com",
]);

/** Extract the eTLD+1 (registrable domain) from a URL, or null on failure. */
function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    // Remove leading 'www.' for comparisons
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Derive the site type heuristically from the URL and snippet. */
function classifySiteType(
  url: string,
  title: string,
  snippet: string,
): WebsiteCandidate["siteType"] {
  const lower = `${url} ${title} ${snippet}`.toLowerCase();

  if (
    lower.includes("portfolio") ||
    lower.includes("my work") ||
    lower.includes("projects") ||
    lower.includes("showcase")
  )
    return "portfolio";

  if (
    lower.includes("blog") ||
    lower.includes("posts") ||
    lower.includes("articles") ||
    lower.includes("writing") ||
    lower.includes("substack")
  )
    return "blog";

  // Generic personal page indicators
  if (
    lower.includes("about me") ||
    lower.includes("personal site") ||
    lower.includes("personal website") ||
    lower.includes("homepage")
  )
    return "personal";

  // Organisation page
  if (
    lower.includes("company") ||
    lower.includes("organisation") ||
    lower.includes("organization") ||
    lower.includes("team") ||
    lower.includes("corp") ||
    lower.includes("inc.")
  )
    return "organization";

  return "personal";
}

/** Compute a confidence score (0–1) and collect evidence for a website candidate. */
function scoreWebsiteCandidate(
  result: SearchResult,
  fullName: string,
  hints: { location?: string; employer?: string; usernameHints?: string[] },
): { confidence: number; evidence: string[] } {
  const { title, url, snippet } = result;
  const combined = `${title} ${snippet}`.toLowerCase();
  const nameLower = fullName.toLowerCase();
  const nameParts = nameLower.split(/\s+/).filter((p) => p.length >= 2);

  let score = 0;
  const evidence: string[] = [];

  // 1. Name in page title (strong signal)
  if (title.toLowerCase().includes(nameLower)) {
    score += 0.4;
    evidence.push(`Full name found in page title`);
  } else {
    const partsInTitle = nameParts.filter((p) => title.toLowerCase().includes(p));
    if (partsInTitle.length === nameParts.length) {
      score += 0.25;
      evidence.push(`All name parts found in title`);
    } else if (partsInTitle.length > 0) {
      score += 0.1;
      evidence.push(`Partial name match in title (${partsInTitle.join(", ")})`);
    }
  }

  // 2. Name in snippet
  if (combined.includes(nameLower)) {
    score += 0.2;
    evidence.push(`Full name found in snippet`);
  } else {
    const partsInSnippet = nameParts.filter((p) => combined.includes(p));
    if (partsInSnippet.length === nameParts.length) {
      score += 0.1;
      evidence.push(`All name parts found in snippet`);
    }
  }

  // 3. Name in domain — only consider the forward direction (domain contains name or its concatenation)
  const domain = extractDomain(url) || "";
  const domainClean = domain.replace(/[.-]/g, "");
  const nameNoSpaces = nameLower.replace(/\s+/g, "");
  if (domainClean.includes(nameNoSpaces) && nameNoSpaces.length >= 4) {
    score += 0.2;
    evidence.push(`Full name appears in domain`);
  } else {
    const partInDomain = nameParts.some((p) => p.length >= 4 && domainClean.includes(p));
    if (partInDomain) {
      score += 0.1;
      evidence.push(`Name part found in domain`);
    }
  }

  // 4. Optional hints
  if (hints.location) {
    const loc = hints.location.toLowerCase();
    if (combined.includes(loc)) {
      score += 0.1;
      evidence.push(`Location hint "${hints.location}" found in content`);
    }
  }

  if (hints.employer) {
    const emp = hints.employer.toLowerCase();
    if (combined.includes(emp)) {
      score += 0.1;
      evidence.push(`Employer hint "${hints.employer}" found in content`);
    }
  }

  if (hints.usernameHints) {
    for (const u of hints.usernameHints) {
      if (combined.includes(u.toLowerCase()) || domain.includes(u.toLowerCase())) {
        score += 0.05;
        evidence.push(`Username hint "${u}" matched`);
        break;
      }
    }
  }

  return { confidence: Math.min(score, 1), evidence };
}

/** Confidence label from numeric score. */
function toConfidenceLabel(score: number): "high" | "medium" | "low" {
  if (score >= 0.6) return "high";
  if (score >= 0.3) return "medium";
  return "low";
}

/**
 * Extracts and scores website candidates from raw search results.
 * Social platform URLs and well-known authority sites are excluded.
 *
 * @param results   Raw search results from any SearchProvider.
 * @param fullName  Target person's full name.
 * @param hints     Optional location / employer / username hints.
 * @param minScore  Minimum confidence score to include (default: 0.15).
 */
export function extractWebsiteCandidates(
  results: SearchResult[],
  fullName: string,
  hints: { location?: string; employer?: string; usernameHints?: string[] } = {},
  minScore = 0.15,
): WebsiteCandidate[] {
  const seen = new Set<string>();
  const candidates: WebsiteCandidate[] = [];

  for (const result of results) {
    const domain = extractDomain(result.url);
    if (!domain) continue;

    // Skip known social platforms and generic authority sites
    if (SOCIAL_PLATFORM_DOMAINS.has(domain)) continue;
    if (GENERIC_AUTHORITY_DOMAINS.has(domain)) continue;

    // Deduplicate by domain
    if (seen.has(domain)) continue;
    seen.add(domain);

    const { confidence, evidence } = scoreWebsiteCandidate(result, fullName, hints);
    if (confidence < minScore) continue;

    candidates.push({
      url: result.url,
      title: result.title,
      description: result.snippet,
      siteType: classifySiteType(result.url, result.title, result.snippet),
      confidence,
      confidenceLabel: toConfidenceLabel(confidence),
      evidence,
    });
  }

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates;
}
