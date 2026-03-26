/**
 * /api/investigative-agent — person-focused investigative agent endpoint.
 *
 * Accepts structured input (name, location, employer, username hints),
 * runs web search to discover social profiles and personal websites,
 * performs digital footprint analysis, and returns a structured report
 * suitable for PDF generation.
 *
 * OSINT DISCLAIMER: All data is gathered from publicly available sources only.
 * No authentication is bypassed. Sensitive PII is redacted by default.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getSearchProvider } from "@/lib/search";
import { extractProfileCandidates } from "@/lib/investigative/candidate-extractor";
import { extractWebsiteCandidates } from "@/lib/investigative/website-discovery";
import { buildFootprintAnalysis } from "@/lib/investigative/footprint-analyzer";
import { fetchPlatformAvatar } from "@/lib/agents/tools/avatar-fetcher";
import { DEFAULT_SOCIAL_DOMAINS } from "@/lib/search/tavily-provider";
import type { PersonInvestigationInput, ProfileCandidate } from "@/lib/investigative/models";
import type { SearchResult } from "@/lib/search/provider";

// ── Input validation ───────────────────────────────────────────────────────────

const PersonInputSchema = z.object({
  fullName: z
    .string()
    .min(2, "fullName must be at least 2 characters")
    .max(120, "fullName must be at most 120 characters")
    .trim(),
  location: z.string().max(100).trim().optional(),
  employer: z.string().max(100).trim().optional(),
  usernameHints: z
    .array(z.string().max(50).trim())
    .max(5, "At most 5 username hints allowed")
    .optional(),
  includeRawPii: z.boolean().optional().default(false),
});

// ── Helper: build search queries ──────────────────────────────────────────────

function buildSearchQueries(input: PersonInvestigationInput): string[] {
  const { fullName, location, employer, usernameHints } = input;

  const queries: string[] = [
    // General social profile search
    `"${fullName}" site:linkedin.com OR site:github.com OR site:twitter.com OR site:instagram.com`,
    // General web presence
    `"${fullName}" social media profile`,
    // With location if provided
    ...(location ? [`"${fullName}" "${location}" profile`] : []),
    // With employer if provided
    ...(employer ? [`"${fullName}" "${employer}"`] : []),
    // Username hints
    ...(usernameHints?.slice(0, 2).map((u) => `"${u}" ${fullName}`) ?? []),
    // Personal website / portfolio
    `"${fullName}" personal website OR portfolio OR blog`,
  ];

  return queries;
}

// ── Helper: run all search queries and merge results ─────────────────────────

async function runSearchQueries(
  queries: string[],
  includeSocial: boolean,
): Promise<SearchResult[]> {
  const provider = getSearchProvider();
  if (!provider.isAvailable()) {
    console.warn("[InvestigativeAgent] No search provider configured — returning empty results.");
    return [];
  }

  const allResults: SearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries) {
    const results = await provider.search(query, {
      includeDomains: includeSocial ? DEFAULT_SOCIAL_DOMAINS : undefined,
      maxResults: 10,
    });

    for (const r of results) {
      const key = r.url.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
      if (!seenUrls.has(key)) {
        seenUrls.add(key);
        allResults.push(r);
      }
    }
  }

  // Website search (no domain filter)
  const websiteResults = await provider.search(
    `"${queries[0].replace(/^"([^"]+)".*/, "$1")}" personal website OR portfolio`,
    { maxResults: 10 },
  );
  for (const r of websiteResults) {
    const key = r.url.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
    if (!seenUrls.has(key)) {
      seenUrls.add(key);
      allResults.push(r);
    }
  }

  return allResults;
}

// ── Helper: enrich profiles with avatars ─────────────────────────────────────

async function enrichWithAvatars(
  profiles: ProfileCandidate[],
): Promise<ProfileCandidate[]> {
  return await Promise.all(
    profiles.map(async (p) => {
      if (!p.username) return p;
      try {
        const avatar = await fetchPlatformAvatar(p.platform, p.username);
        if (avatar) {
          return { ...p, avatarUrl: avatar.avatarUrl, avatarData: avatar.avatarData };
        }
      } catch {
        // Non-fatal — avatar enrichment is best-effort
      }
      return p;
    }),
  );
}

// ── GET — service status ──────────────────────────────────────────────────────

export async function GET() {
  const provider = getSearchProvider();
  return NextResponse.json({
    service: "Investigative Agent",
    status: "online",
    version: "1.0.0",
    searchProvider: provider.name,
    searchProviderAvailable: provider.isAvailable(),
    capabilities: [
      "Person-focused OSINT investigation",
      "Social profile discovery with confidence scoring",
      "Personal website / portfolio discovery",
      "Digital footprint analysis",
      "Avatar/profile image retrieval",
      "PII redaction by default",
      "PDF-ready structured report",
    ],
    disclaimer:
      "All data is gathered from publicly available sources only. " +
      "No authentication is bypassed. This tool is for authorised security research purposes.",
  });
}

// ── POST — run investigation ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Authentication
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate input
  let input: PersonInvestigationInput;
  try {
    const body = await req.json();
    const parsed = PersonInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    input = parsed.data as PersonInvestigationInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const startTime = Date.now();
  const investigationId = crypto.randomUUID();

  console.log(
    `\n[InvestigativeAgent] Starting investigation ${investigationId}: "${input.fullName}"`,
  );

  try {
    const hints = {
      location: input.location,
      employer: input.employer,
      usernameHints: input.usernameHints,
    };

    // 1. Build search queries and run them
    const queries = buildSearchQueries(input);
    const allResults = await runSearchQueries(queries, true);

    const snippets = allResults.map((r) => `${r.title} ${r.snippet}`);

    // 2. Extract and score profile candidates
    let profiles = extractProfileCandidates(allResults, input.fullName, hints);

    // 3. Extract and score website candidates
    const websites = extractWebsiteCandidates(allResults, input.fullName, hints);

    // 4. Enrich high-confidence profiles with avatars (best-effort)
    const profilesToEnrich = profiles.filter((p) => p.confidenceLabel !== "low").slice(0, 6);
    const otherProfiles = profiles.filter(
      (p) => !profilesToEnrich.some((ep) => ep.url === p.url),
    );
    const enriched = await enrichWithAvatars(profilesToEnrich);
    profiles = [...enriched, ...otherProfiles];

    // 5. Build digital footprint analysis
    const footprint = buildFootprintAnalysis(
      input.fullName,
      profiles,
      websites,
      snippets,
      input.includeRawPii ?? false,
    );

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(
      `[InvestigativeAgent] Done in ${duration}s: ${profiles.length} profiles, ${websites.length} websites`,
    );

    return NextResponse.json({
      success: true,
      investigationId,
      input: {
        fullName: input.fullName,
        location: input.location,
        employer: input.employer,
        usernameHints: input.usernameHints,
      },
      profiles,
      websites,
      footprintAnalysis: footprint,
      rawResults: allResults,
      meta: {
        duration,
        searchProvider: getSearchProvider().name,
        generatedAt: new Date().toISOString(),
        disclaimer:
          "This report is generated from publicly available sources using OSINT techniques. " +
          "All sensitive PII is redacted by default. " +
          "For authorized security research purposes only.",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[InvestigativeAgent] Investigation failed: ${message}`);
    return NextResponse.json(
      { error: "Investigation failed", details: message },
      { status: 500 },
    );
  }
}
