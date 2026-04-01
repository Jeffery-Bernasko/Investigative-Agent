import { resolveProvider, LLMClient } from "@/lib/ai/provider-resolver";
import { db } from "@/lib/db";
import {
  ExecutionContext,
  Intent,
  InvestigationResult,
  OsintFindings,
  TraceStep,
} from "./types";
import { investigationTraces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createEntity,
  getEntityByName,
  storeOsintFindings,
} from "./tools/osint-tools";
import { OsintAgent } from "./osint-agent";
import { RelationshipAgent } from "./relationship-agent";
import { AnalysisAgent } from "./analysis-agent";
import { getSafeErrorInfo } from "./utils/errors";
import {
  mapAgentResultToFindings,
  computeFindingsStats,
} from "./utils/result-mapper";
import { analyzeResults, generateRecommendations } from "./utils/analysis";
import { scrapeProfileContent } from "./tools/content-scraper";
import { analyzeContent, ContentAnalysis } from "./tools/analysis-tools";
import { searchWebGeneral } from "./tools/tavily-search";
import { extractUsernameFromUrl } from "./tools/person-search";
import { fetchPlatformAvatar } from "./tools/avatar-fetcher";

// ── Intent parsing — deterministic, no LLM needed ──────────────────────

function parseIntent(userInput: string): Intent {
  const input = userInput.trim();
  const lower = input.toLowerCase();

  // Detect scope from keywords
  const scope: Intent["scope"] = lower.includes("deep") || lower.includes("thorough")
    ? "deep"
    : lower.includes("quick") || lower.includes("fast")
      ? "quick"
      : "standard";

  // Detect intent from keywords
  const intent: Intent["intent"] = lower.startsWith("monitor")
    ? "monitor"
    : lower.startsWith("analyze")
      ? "analyze"
      : lower.startsWith("search") || lower.includes("search for")
        ? "search"
        : "investigate";

  // Strip action words to get target
  const target = input
    .replace(/^(investigate|search|analyze|monitor|deep scan|scan|search for \w+)\s+/i, "")
    .replace(/^@/, "")
    .trim();

  // Detect target type
  let targetType: Intent["targetType"];
  if (target.includes("@") && target.split("@")[1]?.includes(".")) {
    targetType = "email";
  } else if (/^[\d.]+$/.test(target) || target.includes(":")) {
    targetType = "ip";
  } else if (target.includes(".") && !target.includes(" ")) {
    targetType = "domain";
  } else if (/^\+?\d{6,15}$/.test(target.replace(/\D/g, ""))) {
    targetType = "phone";
  } else if (target.includes(" ")) {
    targetType = "person";
  } else {
    targetType = "username";
  }

  return { target, targetType, intent, scope };
}

type WebSearchResult = { title: string; url: string; snippet: string };

function normalizeUrl(url: string): string {
  return url.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
}

function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function collectCollaborativeWebSeeds(findings: OsintFindings, intent: Intent) {
  const usernames = new Set<string>();
  const domains = new Set<string>();
  const excludedUrls = new Set<string>();

  for (const profile of findings.profiles) {
    if (profile.url) {
      excludedUrls.add(normalizeUrl(profile.url));
    }

    const username = profile.username || (profile.url ? extractUsernameFromUrl(profile.url) : null);
    if (username) {
      usernames.add(username.replace(/^@/, "").trim().toLowerCase());
    }
  }

  for (const website of findings.personalWebsites || []) {
    if (website.url) {
      excludedUrls.add(normalizeUrl(website.url));
      const hostname = extractHostname(website.url);
      if (hostname) {
        domains.add(hostname);
      }
    }
  }

  for (const entry of (findings.domains as Array<string | { domain?: string }>) || []) {
    const domain = typeof entry === "string" ? entry : entry?.domain;
    if (typeof domain === "string" && domain.trim()) {
      domains.add(domain.trim().toLowerCase());
    }
  }

  if (intent.targetType === "username") {
    usernames.add(intent.target.replace(/^@/, "").trim().toLowerCase());
  }

  if (intent.targetType === "domain") {
    domains.add(intent.target.trim().toLowerCase());
  }

  return {
    usernames: Array.from(usernames).filter(Boolean),
    domains: Array.from(domains).filter(Boolean),
    excludedUrls,
  };
}

function buildCollaborativeWebQueries(intent: Intent, findings: OsintFindings): {
  queries: string[];
  seeds: { usernames: string[]; domains: string[]; excludedUrls: Set<string> };
} {
  const seeds = collectCollaborativeWebSeeds(findings, intent);
  const target = intent.target.trim();
  const queries: string[] = [`"${target}"`];

  const candidateUsernames = seeds.usernames
    .filter((username) => username !== target.replace(/^@/, "").trim().toLowerCase())
    .slice(0, 2);

  const candidateDomains = seeds.domains
    .filter((domain) => !target.toLowerCase().includes(domain))
    .slice(0, 2);

  for (const username of candidateUsernames) {
    queries.push(intent.targetType === "person" ? `"${target}" "${username}"` : `"${username}"`);
  }

  for (const domain of candidateDomains) {
    queries.push(intent.targetType === "person" ? `"${target}" "${domain}"` : `"${target}" "${domain}"`);
  }

  return {
    queries: Array.from(new Set(queries)).slice(0, 4),
    seeds,
  };
}

function mergeCollaborativeWebResults(
  resultGroups: WebSearchResult[][],
  excludedUrls: Set<string>,
): WebSearchResult[] {
  const deduped = new Map<string, WebSearchResult>();

  for (const result of resultGroups.flat()) {
    const normalizedUrl = normalizeUrl(result.url);
    if (!normalizedUrl || excludedUrls.has(normalizedUrl)) {
      continue;
    }

    if (!deduped.has(normalizedUrl)) {
      deduped.set(normalizedUrl, result);
    }
  }

  return Array.from(deduped.values());
}

//  Orchestrator Agent
export class OrchestratorAgent {
  async investigate(
    userInput: string,
    userId: string,
    options?: { scope?: "quick" | "standard" | "deep"; asyncEnrichment?: boolean }
  ): Promise<InvestigationResult> {
    const startTime = Date.now();
    const investigationId = crypto.randomUUID();
    const traceSteps: TraceStep[] = [];

    console.log(`\n[Orchestrator] Starting investigation: "${userInput}" (${investigationId})`);

    // Resolve provider from user settings (falls back to env vars for Ollama)
    const llm: LLMClient = await resolveProvider(userId);

    // Per-investigation agent instances using the resolved provider
    const osintAgent = new OsintAgent({ name: "OSINT Agent", llm, db });
    const relationshipAgent = new RelationshipAgent({ name: "Relationship Agent", llm, db });
    const analysisAgent = new AnalysisAgent({ name: "Analysis Agent", llm, db });

    /** Record a completed/failed/skipped phase step */
    function recordStep(
      phase: string,
      status: TraceStep["status"],
      phaseStart: number,
      summary?: string,
      error?: string,
    ) {
      traceSteps.push({
        phase,
        status,
        startedAt: new Date(phaseStart).toISOString(),
        completedAt: new Date().toISOString(),
        summary,
        error,
      });
    }

    try {
      // 1. Parse intent (deterministic — no LLM call)
      const intentStart = Date.now();
      const intent = parseIntent(userInput);
      // Apply scope override if provided
      if (options?.scope) intent.scope = options.scope;
      console.log(`[Orchestrator] Intent: target=${intent.target}, type=${intent.targetType}, scope=${intent.scope}`);
      recordStep("intent_parse", "completed", intentStart, `target=${intent.target}, scope=${intent.scope}`);

      // 2. Warmup LLM (only supported by OllamaClient)
      if ("warmup" in llm && typeof (llm as { warmup: unknown }).warmup === "function") {
        await (llm as { warmup(): Promise<void> }).warmup();
      }

      // 3. Prepare entity
      const entity = await this.prepareEntity(intent, userId);
      console.log(`[Orchestrator] Entity ready: ${entity.name} (id=${entity.id})`);

      // Insert trace record (non-fatal)
      try {
        await db.insert(investigationTraces).values({
          id: investigationId,
          userId,
          entityId: entity.id !== -1 ? entity.id : null,
          target: intent.target,
          status: "running",
          startedAt: new Date(startTime),
        });
      } catch (traceErr) {
        console.warn("[Orchestrator] Trace insert failed (non-fatal):", traceErr instanceof Error ? traceErr.message : traceErr);
      }

      const ctx: ExecutionContext = {
        intent,
        entity,
        findings: { profiles: [], emails: [], domains: [], metadata: {} },
        investigationId,
      };

      // 4. OSINT gathering (always runs)
      console.log(`[Orchestrator] Step 1: OSINT gathering...`);
      const osintStart = Date.now();
      const osintResult = await osintAgent.execute({
        entityId: entity.id.toString(),
        description: `Gather comprehensive OSINT on ${intent.targetType}`,
        target: intent.target,
        metadata: { targetType: intent.targetType },
      });

      if (!osintResult.success) {
        console.error(`[Orchestrator] OSINT gathering failed: ${osintResult.error}`);
        recordStep("osint", "failed", osintStart, undefined, osintResult.error);
        return this.buildFailedResult(investigationId, entity, startTime, osintResult.error);
      }

      ctx.findings = mapAgentResultToFindings(osintResult.data);
      computeFindingsStats(ctx.findings, osintResult.confidence);
      console.log(`[Orchestrator] OSINT complete: ${ctx.findings.profiles.length} profiles found`);
      recordStep("osint", "completed", osintStart, `${ctx.findings.profiles.length} profiles, ${ctx.findings.emails.length} emails`);

      // 4b. Collaborative web search (use OSINT findings to guide follow-up search)
      console.log(`[Orchestrator] Step 1b: Collaborative web search...`);
      const webSearchStart = Date.now();
      try {
        const { queries, seeds } = buildCollaborativeWebQueries(intent, ctx.findings);
        console.log(
          `[Orchestrator] Web search seeds: ${seeds.usernames.length} username(s), ${seeds.domains.length} domain(s), ${queries.length} quer${queries.length === 1 ? "y" : "ies"}`,
        );

        ctx.findings.metadata.webSearchCollaboration = {
          mode: "osint-seeded",
          queries,
          usernames: seeds.usernames,
          domains: seeds.domains,
          excludedUrls: seeds.excludedUrls.size,
        };

        const webResultGroups = await Promise.all(
          queries.map((query) => searchWebGeneral(query, process.env.TAVILY_API_KEY, 6)),
        );
        const webResults = mergeCollaborativeWebResults(webResultGroups, seeds.excludedUrls);

        if (webResults.length > 0) {
          ctx.findings.webResults = webResults;
          console.log(`[Orchestrator] Web search: ${webResults.length} results found`);
        } else {
          console.log(`[Orchestrator] Web search: no new results after deduping against OSINT findings`);
        }
        recordStep("web_search", "completed", webSearchStart, `${ctx.findings.webResults?.length ?? 0} results`);
      } catch (error) {
        console.warn(`[Orchestrator] Web search failed (non-fatal):`, error instanceof Error ? error.message : error);
        recordStep("web_search", "failed", webSearchStart, undefined, error instanceof Error ? error.message : String(error));
      }

      // 4c. Avatar enrichment — fetch profile pictures for profiles missing avatarData
      //     Processes in batches of 5 to avoid overwhelming target sites.
      console.log(`[Orchestrator] Step 1c: Enriching profiles with avatars...`);
      const avatarStart = Date.now();
      try {
        let enrichedCount = 0;
        const profilesToEnrich = ctx.findings.profiles.filter(p => p.found && !p.avatarData);

        // Process in batches of 5 for concurrency control
        for (let i = 0; i < profilesToEnrich.length; i += 5) {
          const batch = profilesToEnrich.slice(i, i + 5);
          await Promise.all(
            batch.map(async (profile) => {
              const username = extractUsernameFromUrl(profile.url);
              if (!username) return;
              try {
                const avatar = await fetchPlatformAvatar(profile.platform, username, profile.url);
                if (avatar) {
                  profile.avatarUrl = avatar.avatarUrl;
                  profile.avatarData = avatar.avatarData;
                  profile.username = profile.username || username;
                  enrichedCount++;
                }
              } catch {
                console.log(`[Orchestrator] Avatar fetch failed for ${profile.platform} (non-fatal)`);
              }
            }),
          );
        }
        console.log(`[Orchestrator] Avatar enrichment: ${enrichedCount}/${profilesToEnrich.length} profile picture(s) downloaded`);
        recordStep("avatar", "completed", avatarStart, `${enrichedCount} avatars fetched`);
      } catch (error) {
        console.warn(`[Orchestrator] Avatar enrichment failed (non-fatal):`, error instanceof Error ? error.message : error);
        recordStep("avatar", "failed", avatarStart, undefined, error instanceof Error ? error.message : String(error));
      }

      // 5. Content scraping (standard and deep scopes)
      const contentScrapeStart = Date.now();
      if (intent.scope !== "quick") {
        console.log(`[Orchestrator] Step 2: Fetching profile content...`);
        try {
          const contentResult = await scrapeProfileContent(ctx.findings.profiles, {
            maxPostsPerPlatform: 10,
            maxPlatforms: 5,
          });
          ctx.findings.contentData = contentResult.contents;
          console.log(`[Orchestrator] Content: ${contentResult.summary.totalPosts} posts from ${contentResult.summary.platformsScraped} platforms`);
          recordStep("content_scrape", "completed", contentScrapeStart, `${contentResult.summary.totalPosts} posts, ${contentResult.summary.platformsScraped} platforms`);
        } catch (error) {
          console.warn(`[Orchestrator] Content scraping failed (non-fatal):`, error instanceof Error ? error.message : error);
          recordStep("content_scrape", "failed", contentScrapeStart, undefined, error instanceof Error ? error.message : String(error));
        }
      } else {
        recordStep("content_scrape", "skipped", contentScrapeStart, "quick scope");
      }

      // 6. Content analysis (standard and deep scopes, if content was scraped)
      let contentAnalysis: ContentAnalysis | undefined;
      if (ctx.findings.contentData && ctx.findings.contentData.length > 0) {
        console.log(`[Orchestrator] Step 2b: Analyzing content...`);
        contentAnalysis = analyzeContent(ctx.findings.contentData);
        ctx.contentAnalysis = contentAnalysis;
        console.log(`[Orchestrator] Content analysis: ${contentAnalysis.topTopics.length} topics, sentiment=${contentAnalysis.sentiment}, ${contentAnalysis.redFlags.length} red flags`);
      }

      // 7. Risk analysis + recommendations (always runs)
      console.log(`[Orchestrator] Step 3: Risk analysis...`);
      const riskStart = Date.now();
      ctx.analysis = await analyzeResults(llm, ctx.findings, intent, contentAnalysis);
      ctx.recommendations = generateRecommendations(ctx.findings, ctx.analysis.riskScore);
      console.log(`[Orchestrator] Risk score: ${ctx.analysis.riskScore}/10, ${ctx.recommendations.length} recommendations`);
      recordStep("risk_analysis", "completed", riskStart, `score=${ctx.analysis.riskScore}/10, ${ctx.recommendations.length} recs`);

      // 7. Store + relationships (standard and deep scopes, skip if in-memory entity)
      const relStart = Date.now();
      if (intent.scope !== "quick" && entity.id !== -1) {
        console.log(`[Orchestrator] Step 4: Storing findings...`);
        await storeOsintFindings(entity.id, {
          findings: ctx.findings,
          analysis: ctx.analysis,
          recommendations: ctx.recommendations,
          investigationId,
        });

        console.log(`[Orchestrator] Step 5: Discovering relationships...`);
        const relResult = await relationshipAgent.execute({
          entityId: entity.id.toString(),
          description: "Discover and map relationships",
          target: entity.name,
        });

        if (relResult.success) {
          ctx.relationships = relResult.data?.relationships;
          ctx.networkAnalysis = relResult.data?.networkAnalysis;
          ctx.graphData = relResult.data?.graphData;
          console.log(`[Orchestrator] Relationships: ${relResult.data?.relationships?.length || 0} connections`);
          recordStep("relationship", "completed", relStart, `${relResult.data?.relationships?.length ?? 0} connections`);
        } else {
          console.warn(`[Orchestrator] Relationship discovery failed (non-fatal): ${relResult.error}`);
          recordStep("relationship", "failed", relStart, undefined, relResult.error);
        }
      } else {
        recordStep("relationship", "skipped", relStart, intent.scope === "quick" ? "quick scope" : "in-memory entity");
      }

      // 8. Deep analysis (deep scope only, skip if in-memory entity)
      const deepStart = Date.now();
      if (intent.scope === "deep" && entity.id !== -1) {
        console.log(`[Orchestrator] Step 6: Deep behavioral analysis...`);
        const analysisResult = await analysisAgent.execute({
          entityId: entity.id.toString(),
          description: "Deep behavioral analysis and digital footprint monitoring",
          target: entity.name,
          metadata: {
            investigationData: {
              findings: ctx.findings,
              relationships: ctx.relationships,
              networkAnalysis: ctx.networkAnalysis,
            },
          },
        });

        if (analysisResult.success) {
          ctx.deepAnalysis = analysisResult.data;
          console.log(`[Orchestrator] Deep analysis: ${analysisResult.data?.insights?.length || 0} insights`);
          recordStep("deep_analysis", "completed", deepStart, `${analysisResult.data?.insights?.length ?? 0} insights`);
        } else {
          console.warn(`[Orchestrator] Deep analysis failed (non-fatal): ${analysisResult.error}`);
          recordStep("deep_analysis", "failed", deepStart, undefined, analysisResult.error);
        }
      } else {
        recordStep("deep_analysis", "skipped", deepStart, intent.scope !== "deep" ? "not deep scope" : "in-memory entity");
      }

      // Done
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Orchestrator] Investigation complete in ${duration}s`);

      // Update trace to completed (non-fatal)
      try {
        await db.update(investigationTraces)
          .set({
            status: "completed",
            steps: traceSteps,
            totalLatencyMs: Date.now() - startTime,
            completedAt: new Date(),
          })
          .where(eq(investigationTraces.id, investigationId));
      } catch (traceErr) {
        console.warn("[Orchestrator] Trace update failed (non-fatal):", traceErr instanceof Error ? traceErr.message : traceErr);
      }

      return {
        investigationId,
        entity,
        status: "completed",
        findings: ctx.findings,
        analysis: ctx.analysis,
        recommendations: ctx.recommendations,
        contentAnalysis,
        relationships: ctx.relationships,
        networkAnalysis: ctx.networkAnalysis,
        graphData: ctx.graphData,
        deepAnalysis: ctx.deepAnalysis,
        duration,
        createdAt: new Date(),
      };
    } catch (error: unknown) {
      const err = getSafeErrorInfo(error);
      console.error(`[Orchestrator] Investigation failed: ${err.name}: ${err.message}`);
      const duration = Math.round((Date.now() - startTime) / 1000);

      // Update trace to failed (non-fatal)
      try {
        await db.update(investigationTraces)
          .set({
            status: "failed",
            steps: traceSteps,
            errors: [err.message],
            totalLatencyMs: Date.now() - startTime,
            completedAt: new Date(),
          })
          .where(eq(investigationTraces.id, investigationId));
      } catch (traceErr) {
        console.warn("[Orchestrator] Trace update (failure) failed (non-fatal):", traceErr instanceof Error ? traceErr.message : traceErr);
      }

      return {
        investigationId,
        entity: null as any,
        status: "failed",
        findings: { profiles: [], emails: [], domains: [], metadata: {} },
        recommendations: ["Investigation failed. Please try again."],
        duration,
        createdAt: new Date(),
      };
    }
  }

  private buildFailedResult(
    investigationId: string,
    entity: any,
    startTime: number,
    error?: string
  ): InvestigationResult {
    return {
      investigationId,
      entity,
      status: "failed",
      findings: { profiles: [], emails: [], domains: [], metadata: {} },
      recommendations: [error || "Investigation failed. Please try again."],
      duration: Math.round((Date.now() - startTime) / 1000),
      createdAt: new Date(),
    };
  }

  private async prepareEntity(intent: Intent, userId: string) {
    try {
      const existing = await getEntityByName(intent.target, userId);
      if (existing) {
        return existing;
      }

      return await createEntity({
        name: intent.target,
        type: intent.targetType,
        userId,
        metadata: {
          source: "orchestrator",
          intent: intent.intent,
          scope: intent.scope,
        },
      });
    } catch (error) {
      console.warn(
        `[Orchestrator] DB entity operation failed, using in-memory entity:`,
        error instanceof Error ? error.message : error
      );
      return {
        id: -1,
        name: intent.target,
        type: intent.targetType,
        userId,
        metadata: { source: "orchestrator-fallback" },
      };
    }
  }
}
