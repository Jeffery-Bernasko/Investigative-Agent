import { createOllamaClient, OllamaClient } from "@/lib/ai/ollama-adapter";
import { db } from "@/lib/db";
import { Intent, InvestigationResult, OsintFindings } from "./types";
import {
  createEntity,
  getEntityByName,
  storeOsintFindings,
} from "./tools/osint-tools";
import { OsintAgent } from "./osint-agent";
import { RelationshipAgent } from "./relationship-agent";
import { getSafeErrorInfo } from "./utils/errors";
import { parseIntent, createPlan } from "./utils/llm-helpers";
import { analyzeResults, generateRecommendations } from "./utils/analysis";
import {
  mapAgentResultToFindings,
  computeFindingsStats,
} from "./utils/result-mapper";

export class OrchestratorAgent {
  private llm: OllamaClient;
  private db: any;
  private osintAgent: OsintAgent;
  private relationshipAgent: RelationshipAgent;

  constructor() {
    this.llm = createOllamaClient({
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "mistral",
    });

    this.db = db;

    this.osintAgent = new OsintAgent({
      name: "OSINT Agent",
      llm: this.llm,
      db: this.db,
    });

    this.relationshipAgent = new RelationshipAgent({
      name: "Relationship Agent",
      llm: this.llm,
      db: this.db,
    });
  }

  async investigate(
    userInput: string,
    userId: string
  ): Promise<InvestigationResult> {
    const startTime = Date.now();
    const investigationId = crypto.randomUUID();

    console.log(`\n🎯 ============================================`);
    console.log(`🎯 ORCHESTRATOR: Starting Investigation`);
    console.log(`🎯 Query: "${userInput}"`);
    console.log(`🎯 Investigation ID: ${investigationId}`);
    console.log(`🎯 ============================================\n`);

    try {
      // Warmup: pre-load Ollama model into memory (handles cold-start)
      await this.llm.warmup();

      // Step 1: Parse user intent
      console.log(`📝 Step 1: Parsing user intent...`);
      const intent = await parseIntent(this.llm, userInput);
      console.log(`✅ Intent parsed:`, JSON.stringify(intent, null, 2));

      // Step 2: Create investigation plan
      console.log(`\n📋 Step 2: Creating investigation plan...`);
      const plan = await createPlan(this.llm, intent);
      console.log(`✅ Plan created:`, JSON.stringify(plan, null, 2));

      // Step 3: Prepare entity
      console.log(`\n🔧 Step 3: Preparing entity...`);
      const entity = await this.prepareEntity(intent, userId);
      console.log(`✅ Entity ready: ${entity.name} (ID: ${entity.id})`);

      // Step 4: Execute investigation with OSINT Agent
      console.log(`\n🚀 Step 4: Executing investigation with OSINT Agent...`);
      const osintResult = await this.runOsintAgent(intent, entity);
      const findings = mapAgentResultToFindings(osintResult.data);
      computeFindingsStats(findings, osintResult.confidence);
      console.log(
        `✅ Investigation complete. Found ${findings.profiles.length} profiles.`
      );

      // Step 5: Analyze results
      console.log(`\n🧪 Step 5: Analyzing results...`);
      const analysis = await analyzeResults(this.llm, findings, intent);
      console.log(
        `✅ Analysis complete. Risk Score: ${analysis.riskScore}/10`
      );

      // Step 6: Generate recommendations
      console.log(`\n💡 Step 6: Generating recommendations...`);
      const recommendations = generateRecommendations(
        findings,
        analysis.riskScore
      );
      console.log(`✅ Generated ${recommendations.length} recommendations.`);

      // Step 7: Store results
      console.log(`\n💾 Step 7: Storing investigation results...`);
      await storeOsintFindings(entity.id, {
        findings,
        analysis,
        recommendations,
        investigationId,
      });

      // Step 8: Discover relationships (non-blocking — failure won't break investigation)
      console.log(`\n🕸️ Step 8: Discovering relationships...`);
      const { relationships, networkAnalysis, graphData } =
        await this.runRelationshipAgent(entity);

      const duration = Math.round((Date.now() - startTime) / 1000);

      console.log(`\n✅ ============================================`);
      console.log(`✅ INVESTIGATION COMPLETE`);
      console.log(`✅ Duration: ${duration} seconds`);
      console.log(`✅ ============================================\n`);

      return {
        investigationId,
        entity,
        status: "completed",
        findings,
        analysis,
        recommendations,
        relationships,
        networkAnalysis,
        graphData,
        duration,
        createdAt: new Date(),
      };
    } catch (error: unknown) {
      const err = getSafeErrorInfo(error);
      console.error(`\nInvestigation failed: ${err.name}: ${err.message}`);
      if (err.stack) {
        console.error(err.stack);
      }
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

  private async prepareEntity(intent: Intent, userId: string) {
    try {
      const existing = await getEntityByName(intent.target, userId);

      if (existing) {
        console.log(`📦 Found existing entity: ${intent.target}`);
        return existing;
      }

      console.log(`✨ Creating new entity: ${intent.target}`);
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
        `⚠️ DB entity operation failed, using in-memory entity:`,
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

  private async runOsintAgent(intent: Intent, entity: any) {
    if (intent.targetType === "person") {
      console.log(
        `👤 Person detected: "${intent.target}" → using name-first search strategy`
      );
    }

    console.log(`🤖 Delegating to OSINT Agent...`);
    const result = await this.osintAgent.execute({
      entityId: entity.id.toString(),
      description: `Gather comprehensive OSINT on ${intent.targetType}`,
      target: intent.target,
      metadata: {
        originalTarget: intent.target,
        targetType: intent.targetType,
      },
    });

    if (!result.success) {
      console.error(`❌ OSINT Agent failed:`, result.error);
      return { data: {}, confidence: undefined };
    }

    return { data: result.data, confidence: result.confidence };
  }

  private async runRelationshipAgent(entity: any) {
    try {
      // Skip for in-memory fallback entities (no DB data to analyze)
      if (entity.id === -1) {
        console.log(
          `⚠️ Skipping relationship analysis (in-memory entity)`
        );
        return {};
      }

      console.log(`🤖 Delegating to Relationship Agent...`);
      const result = await this.relationshipAgent.execute({
        entityId: entity.id.toString(),
        description: "Discover and map relationships",
        target: entity.name,
      });

      if (!result.success) {
        console.warn(
          `⚠️ Relationship Agent failed (non-fatal):`,
          result.error
        );
        return {};
      }

      console.log(
        `✅ Relationship analysis complete. Found ${result.data?.relationships?.length || 0} connections.`
      );

      return {
        relationships: result.data?.relationships,
        networkAnalysis: result.data?.networkAnalysis,
        graphData: result.data?.graphData,
      };
    } catch (error) {
      console.warn(
        `⚠️ Relationship analysis failed (non-fatal):`,
        error instanceof Error ? error.message : error
      );
      return {};
    }
  }
}