import { createOllamaClient, OllamaClient } from "@/lib/ai/ollama-adapter";
import { db } from "@/lib/db";
import {
  ExecutionContext,
  Intent,
  InvestigationResult,
  OsintFindings,
} from "./types";
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

//  Orchestrator Agent 
export class OrchestratorAgent {
  private llm: OllamaClient;
  private osintAgent: OsintAgent;
  private relationshipAgent: RelationshipAgent;
  private analysisAgent: AnalysisAgent;

  constructor() {
    this.llm = createOllamaClient({
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "mistral",
    });

    this.osintAgent = new OsintAgent({
      name: "OSINT Agent",
      llm: this.llm,
      db: db,
    });

    this.relationshipAgent = new RelationshipAgent({
      name: "Relationship Agent",
      llm: this.llm,
      db: db,
    });

    this.analysisAgent = new AnalysisAgent({
      name: "Analysis Agent",
      llm: this.llm,
      db: db,
    });
  }

  async investigate(
    userInput: string,
    userId: string
  ): Promise<InvestigationResult> {
    const startTime = Date.now();
    const investigationId = crypto.randomUUID();

    console.log(`\n[Orchestrator] Starting investigation: "${userInput}" (${investigationId})`);

    try {
      // 1. Parse intent (deterministic — no LLM call)
      const intent = parseIntent(userInput);
      console.log(`[Orchestrator] Intent: target=${intent.target}, type=${intent.targetType}, scope=${intent.scope}`);

      // 2. Warmup LLM
      await this.llm.warmup();

      // 3. Prepare entity
      const entity = await this.prepareEntity(intent, userId);
      console.log(`[Orchestrator] Entity ready: ${entity.name} (id=${entity.id})`);

      const ctx: ExecutionContext = {
        intent,
        entity,
        findings: { profiles: [], emails: [], domains: [], metadata: {} },
        investigationId,
      };

      // 4. OSINT gathering (always runs)
      console.log(`[Orchestrator] Step 1: OSINT gathering...`);
      const osintResult = await this.osintAgent.execute({
        entityId: entity.id.toString(),
        description: `Gather comprehensive OSINT on ${intent.targetType}`,
        target: intent.target,
        metadata: { targetType: intent.targetType },
      });

      if (!osintResult.success) {
        console.error(`[Orchestrator] OSINT gathering failed: ${osintResult.error}`);
        return this.buildFailedResult(investigationId, entity, startTime, osintResult.error);
      }

      ctx.findings = mapAgentResultToFindings(osintResult.data);
      computeFindingsStats(ctx.findings, osintResult.confidence);
      console.log(`[Orchestrator] OSINT complete: ${ctx.findings.profiles.length} profiles found`);

      // 5. Content scraping (standard and deep scopes)
      if (intent.scope !== "quick") {
        console.log(`[Orchestrator] Step 2: Fetching profile content...`);
        try {
          const contentResult = await scrapeProfileContent(ctx.findings.profiles, {
            maxPostsPerPlatform: 10,
            maxPlatforms: 5,
          });
          ctx.findings.contentData = contentResult.contents;
          console.log(`[Orchestrator] Content: ${contentResult.summary.totalPosts} posts from ${contentResult.summary.platformsScraped} platforms`);
        } catch (error) {
          console.warn(`[Orchestrator] Content scraping failed (non-fatal):`, error instanceof Error ? error.message : error);
        }
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
      ctx.analysis = await analyzeResults(this.llm, ctx.findings, intent, contentAnalysis);
      ctx.recommendations = generateRecommendations(ctx.findings, ctx.analysis.riskScore);
      console.log(`[Orchestrator] Risk score: ${ctx.analysis.riskScore}/10, ${ctx.recommendations.length} recommendations`);

      // 7. Store + relationships (standard and deep scopes, skip if in-memory entity)
      if (intent.scope !== "quick" && entity.id !== -1) {
        console.log(`[Orchestrator] Step 4: Storing findings...`);
        await storeOsintFindings(entity.id, {
          findings: ctx.findings,
          analysis: ctx.analysis,
          recommendations: ctx.recommendations,
          investigationId,
        });

        console.log(`[Orchestrator] Step 5: Discovering relationships...`);
        const relResult = await this.relationshipAgent.execute({
          entityId: entity.id.toString(),
          description: "Discover and map relationships",
          target: entity.name,
        });

        if (relResult.success) {
          ctx.relationships = relResult.data?.relationships;
          ctx.networkAnalysis = relResult.data?.networkAnalysis;
          ctx.graphData = relResult.data?.graphData;
          console.log(`[Orchestrator] Relationships: ${relResult.data?.relationships?.length || 0} connections`);
        } else {
          console.warn(`[Orchestrator] Relationship discovery failed (non-fatal): ${relResult.error}`);
        }
      }

      // 8. Deep analysis (deep scope only, skip if in-memory entity)
      if (intent.scope === "deep" && entity.id !== -1) {
        console.log(`[Orchestrator] Step 6: Deep behavioral analysis...`);
        const analysisResult = await this.analysisAgent.execute({
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
        } else {
          console.warn(`[Orchestrator] Deep analysis failed (non-fatal): ${analysisResult.error}`);
        }
      }

      // 8. Done
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Orchestrator] Investigation complete in ${duration}s`);

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