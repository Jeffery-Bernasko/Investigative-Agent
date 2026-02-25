import {
    ExecutionContext,
    StepResult,
    ToolDependencies,
    ToolHandler,
} from "./types";
import {
    storeOsintFindings,
} from "./tools/osint-tools";
import {
    mapAgentResultToFindings,
    computeFindingsStats,
} from "./utils/result-mapper";
import { analyzeResults, generateRecommendations } from "./utils/analysis";

// Tool Handlers
const osintGather: ToolHandler = {
    name: "osint-gather",
    async execute(ctx, deps): Promise<StepResult> {
        if (ctx.intent.targetType === "person") {
            console.log(
                `👤 Person detected: "${ctx.intent.target}" → using name-first search strategy`
            );
        }

        console.log(`🤖 Delegating to OSINT Agent...`);
        const result = await deps.osintAgent.execute({
            entityId: ctx.entity.id.toString(),
            description: `Gather comprehensive OSINT on ${ctx.intent.targetType}`,
            target: ctx.intent.target,
            metadata: {
                originalTarget: ctx.intent.target,
                targetType: ctx.intent.targetType,
            },
        });

        if (!result.success) {
            console.error(`❌ OSINT Agent failed:`, result.error);
            return {
                status: "failed",
                summary: `OSINT gathering failed: ${result.error}`,
                error: result.error,
            };
        }

        // Map raw agent output → normalized findings and store on context
        ctx.findings = mapAgentResultToFindings(result.data);
        computeFindingsStats(ctx.findings, result.confidence);

        const profileCount = ctx.findings.profiles.length;
        console.log(`✅ Investigation complete. Found ${profileCount} profiles.`);

        return {
            status: "success",
            summary: `${profileCount} profiles found`,
            confidence: result.confidence,
        };
    },
};

const analyzeRisk: ToolHandler = {
    name: "analyze-risk",
    async execute(ctx, deps): Promise<StepResult> {
        if (!ctx.findings || ctx.findings.profiles.length === 0) {
            return {
                status: "skipped",
                summary: "No findings available to analyze",
            };
        }

        const analysis = await analyzeResults(deps.llm, ctx.findings, ctx.intent);
        ctx.analysis = analysis;

        console.log(`✅ Analysis complete. Risk Score: ${analysis.riskScore}/10`);

        return {
            status: "success",
            summary: `riskScore=${analysis.riskScore}/10`,
        };
    },
};

const genRecommendations: ToolHandler = {
    name: "generate-recommendations",
    async execute(ctx): Promise<StepResult> {
        if (!ctx.analysis) {
            return {
                status: "skipped",
                summary: "No analysis available — skipping recommendations",
            };
        }

        const recs = generateRecommendations(ctx.findings, ctx.analysis.riskScore);
        ctx.recommendations = recs;

        console.log(`✅ Generated ${recs.length} recommendations.`);

        return {
            status: "success",
            summary: `${recs.length} recommendations`,
        };
    },
};

const storeFindings: ToolHandler = {
    name: "store-findings",
    async execute(ctx): Promise<StepResult> {
        if (ctx.entity.id === -1) {
            return {
                status: "skipped",
                summary: "In-memory entity — cannot persist",
            };
        }

        await storeOsintFindings(ctx.entity.id, {
            findings: ctx.findings,
            analysis: ctx.analysis,
            recommendations: ctx.recommendations,
            investigationId: ctx.investigationId,
        });

        return {
            status: "success",
            summary: "Findings persisted to DB",
        };
    },
};

const discoverRelationships: ToolHandler = {
    name: "discover-relationships",
    async execute(ctx, deps): Promise<StepResult> {
        if (ctx.entity.id === -1) {
            console.log(`⚠️ Skipping relationship analysis (in-memory entity)`);
            return {
                status: "skipped",
                summary: "In-memory entity — skipped",
            };
        }

        console.log(`🤖 Delegating to Relationship Agent...`);
        const result = await deps.relationshipAgent.execute({
            entityId: ctx.entity.id.toString(),
            description: "Discover and map relationships",
            target: ctx.entity.name,
        });

        if (!result.success) {
            console.warn(
                `⚠️ Relationship Agent failed (non-fatal):`,
                result.error
            );
            return {
                status: "failed",
                summary: `Relationship discovery failed: ${result.error}`,
                error: result.error,
            };
        }

        const relCount = result.data?.relationships?.length || 0;
        ctx.relationships = result.data?.relationships;
        ctx.networkAnalysis = result.data?.networkAnalysis;
        ctx.graphData = result.data?.graphData;

        console.log(
            `✅ Relationship analysis complete. Found ${relCount} connections.`
        );

        return {
            status: "success",
            summary: `${relCount} relationships discovered`,
        };
    },
};

const deepAnalysis: ToolHandler = {
    name: "deep-analysis",
    async execute(ctx, deps): Promise<StepResult> {
        if (ctx.entity.id === -1) {
            console.log(`⚠️ Skipping deep analysis (in-memory entity)`);
            return {
                status: "skipped",
                summary: "In-memory entity — skipped",
            };
        }

        console.log(`🤖 Delegating to Analysis Agent...`);
        const result = await deps.analysisAgent.execute({
            entityId: ctx.entity.id.toString(),
            description:
                "Deep behavioral analysis and digital footprint monitoring",
            target: ctx.entity.name,
            metadata: {
                investigationData: {
                    findings: ctx.findings,
                    relationships: ctx.relationships,
                    networkAnalysis: ctx.networkAnalysis,
                },
            },
        });

        if (!result.success) {
            console.warn(`⚠️ Analysis Agent failed (non-fatal):`, result.error);
            return {
                status: "failed",
                summary: `Deep analysis failed: ${result.error}`,
                error: result.error,
            };
        }

        ctx.deepAnalysis = result.data;
        const insightCount = result.data?.insights?.length || 0;
        console.log(`✅ Deep analysis complete. Insights: ${insightCount}`);

        return {
            status: "success",
            summary: `${insightCount} insights generated`,
            confidence: result.confidence,
        };
    },
};

// Registry
export class ToolRegistry {
    private handlers = new Map<string, ToolHandler>();

    register(id: string, handler: ToolHandler): void {
        this.handlers.set(id, handler);
    }

    get(id: string): ToolHandler | undefined {
        return this.handlers.get(id);
    }

    has(id: string): boolean {
        return this.handlers.has(id);
    }

    listToolIds(): string[] {
        return Array.from(this.handlers.keys());
    }
}

/**
 * Create the default registry with all built-in tool handlers.
 */
export function createDefaultRegistry(): ToolRegistry {
    const registry = new ToolRegistry();
    registry.register("osint-gather", osintGather);
    registry.register("analyze-risk", analyzeRisk);
    registry.register("generate-recommendations", genRecommendations);
    registry.register("store-findings", storeFindings);
    registry.register("discover-relationships", discoverRelationships);
    registry.register("deep-analysis", deepAnalysis);
    return registry;
}
