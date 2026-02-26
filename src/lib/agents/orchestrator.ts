import { createOllamaClient, OllamaClient } from "@/lib/ai/ollama-adapter";
import { db } from "@/lib/db";
import { investigationTraces } from "@/lib/db/schema";
import {
  ExecutionContext,
  Intent,
  InvestigationResult,
  InvestigationTrace,
  OsintFindings,
  PlanStep,
  StepResult,
  ToolDependencies,
  TraceStep,
  ReplanEvent,
} from "./types";
import {
  createEntity,
  getEntityByName,
} from "./tools/osint-tools";
import { OsintAgent } from "./osint-agent";
import { RelationshipAgent } from "./relationship-agent";
import { AnalysisAgent } from "./analysis-agent";
import { getSafeErrorInfo } from "./utils/errors";
import { parseIntent, createPlan, evaluateStepResults, replanFromContext } from "./utils/llm-helpers";
import { createDefaultRegistry, ToolRegistry } from "./tool-registry";

// Trace Collector — captures step-level telemetry
class TraceCollector {
  private steps: TraceStep[] = [];
  private errors: string[] = [];
  private replanEvents: ReplanEvent[] = [];
  private currentStep: { stepNumber: number; name: string; startMs: number } | null = null;
  private runStartMs: number;

  constructor(
    private traceId: string,
    private userId: string,
    private target: string,
    private planVersion: number = 1
  ) {
    this.runStartMs = Date.now();
  }

  startStep(stepNumber: number, name: string): void {
    this.currentStep = { stepNumber, name, startMs: Date.now() };
  }

  endStep(
    status: TraceStep["status"],
    opts?: {
      agentName?: string;
      confidenceBefore?: number;
      confidenceAfter?: number;
      toolCalls?: string[];
      resultSummary?: string;
      error?: string;
    }
  ): void {
    if (!this.currentStep) return;
    const latencyMs = Date.now() - this.currentStep.startMs;

    const step: TraceStep = {
      stepNumber: this.currentStep.stepNumber,
      name: this.currentStep.name,
      status,
      latencyMs,
      ...opts,
    };

    this.steps.push(step);

    if (opts?.error) {
      this.errors.push(`Step ${this.currentStep.stepNumber} (${this.currentStep.name}): ${opts.error}`);
    }

    this.currentStep = null;
  }

  addError(msg: string): void {
    this.errors.push(msg);
  }

  addReplanEvent(event: ReplanEvent): void {
    this.replanEvents.push(event);
  }

  finalize(status: InvestigationTrace["status"]): InvestigationTrace {
    if (this.currentStep) {
      this.endStep("failed", { error: "Step did not complete (unhandled error)" });
    }

    return {
      traceId: this.traceId,
      userId: this.userId,
      target: this.target,
      planVersion: this.planVersion,
      steps: this.steps,
      totalLatencyMs: Date.now() - this.runStartMs,
      status,
      errors: this.errors,
      replanEvents: this.replanEvents,
      startedAt: new Date(this.runStartMs),
      completedAt: new Date(),
    };
  }
}

// Step Executor — per-step timeout wrapper
const DEFAULT_STEP_TIMEOUT_MS = 120_000; // 2 minutes
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  stepName: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Step "${stepName}" timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

// Orchestrator Agent
export class OrchestratorAgent {
  private llm: OllamaClient;
  private db: any;
  private registry: ToolRegistry;
  private deps: ToolDependencies;

  constructor() {
    this.llm = createOllamaClient({
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "mistral",
    });

    this.db = db;

    const osintAgent = new OsintAgent({
      name: "OSINT Agent",
      llm: this.llm,
      db: this.db,
    });

    const relationshipAgent = new RelationshipAgent({
      name: "Relationship Agent",
      llm: this.llm,
      db: this.db,
    });

    const analysisAgent = new AnalysisAgent({
      name: "Analysis Agent",
      llm: this.llm,
      db: this.db,
    });

    this.deps = {
      llm: this.llm,
      db: this.db,
      osintAgent,
      relationshipAgent,
      analysisAgent,
    };

    this.registry = createDefaultRegistry();
  }

  async investigate(
    userInput: string,
    userId: string
  ): Promise<InvestigationResult> {
    const startTime = Date.now();
    const investigationId = crypto.randomUUID();
    const trace = new TraceCollector(investigationId, userId, userInput);

    console.log(`\n🎯 ============================================`);
    console.log(`🎯 ORCHESTRATOR: Starting Investigation`);
    console.log(`🎯 Query: "${userInput}"`);
    console.log(`🎯 Investigation ID: ${investigationId}`);
    console.log(`🎯 ============================================\n`);

    try {
      // ── Bootstrap Phase (always runs)
      // Warmup: pre-load Ollama model
      await this.llm.warmup();

      // Bootstrap 1: Parse intent
      console.log(`📝 Bootstrap 1: Parsing user intent...`);
      trace.startStep(0, "parseIntent");
      const intent = await parseIntent(this.llm, userInput);
      trace.endStep("success", {
        toolCalls: ["parseIntent"],
        resultSummary: `target=${intent.target}, type=${intent.targetType}, scope=${intent.scope}`,
      });
      console.log(`✅ Intent parsed:`, JSON.stringify(intent, null, 2));

      // Bootstrap 2: Create plan
      console.log(`\n📋 Bootstrap 2: Creating investigation plan...`);
      trace.startStep(0, "createPlan");
      const plan = await createPlan(this.llm, intent);
      trace.endStep("success", {
        toolCalls: ["createPlan"],
        resultSummary: `${plan.steps.length} steps planned`,
      });
      console.log(`✅ Plan created:`, JSON.stringify(plan, null, 2));

      // Bootstrap 3: Prepare entity
      console.log(`\n🔧 Bootstrap 3: Preparing entity...`);
      trace.startStep(0, "prepareEntity");
      const entity = await this.prepareEntity(intent, userId);
      trace.endStep(entity.id === -1 ? "failed" : "success", {
        toolCalls: ["getEntityByName", "createEntity"],
        resultSummary: `entity=${entity.name} (id=${entity.id})`,
        error: entity.id === -1 ? "Fell back to in-memory entity" : undefined,
      });
      console.log(`✅ Entity ready: ${entity.name} (ID: ${entity.id})`);
      const ctx: ExecutionContext = {
        intent,
        entity,
        findings: { profiles: [], emails: [], domains: [], metadata: {} },
        investigationId,
      };

      // Sort steps by priority, then by step number
      let sortedSteps = [...plan.steps].sort((a, b) =>
        a.priority !== b.priority ? a.priority - b.priority : a.step - b.step
      );

      const completedSteps = new Set<number>();

      const MAX_ITERATIONS = 15;
      const MAX_REPLANS = 3;
      let iterations = 0;
      let replanCount = 0;
      let planVersion = 1;

      console.log(
        `\n⚡ Executing ${sortedSteps.length} planned steps...\n`
      );

      while (sortedSteps.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        const planStep = sortedSteps.shift()!;

        // Check dependency
        if (planStep.dependsOn && !completedSteps.has(planStep.dependsOn)) {
          console.warn(
            `⏭️ Step ${planStep.step} (${planStep.tool}) skipped — depends on uncompleted step ${planStep.dependsOn}`
          );
          trace.startStep(planStep.step, planStep.tool);
          trace.endStep("skipped", {
            resultSummary: `Dependency step ${planStep.dependsOn} not completed`,
          });
          continue;
        }

        const result = await this.executeStep(planStep, ctx, trace);
        if (result.status === "success") {
          completedSteps.add(planStep.step);
        }

        // EVALUATION & REPLAN LOGIC
        if (replanCount < MAX_REPLANS) {
          const reflection = await evaluateStepResults(
            this.llm,
            intent,
            ctx.findings,
            result,
            planStep.tool
          );

          if (
            reflection.needsReplan ||
            (reflection.confidenceScore < 50 && result.status === "failed")
          ) {
            console.log(
              `\n🔄 REPLAN TRIGGERED (Reason: ${reflection.reason}, Confidence: ${reflection.confidenceScore})`
            );
            replanCount++;

            const event: ReplanEvent = {
              stepNumber: planStep.step,
              reason: reflection.reason,
              previousPlanVersion: planVersion,
              newPlanVersion: planVersion + 1,
              confidenceScore: reflection.confidenceScore,
            };
            trace.addReplanEvent(event);
            planVersion++;

            const newPlan = await replanFromContext(
              this.llm,
              intent,
              ctx,
              Array.from(completedSteps),
              reflection.reason
            );

            // Keep steps from the new plan that haven't been completed yet
            const newRemaining = newPlan.steps.filter(
              (s) => !completedSteps.has(s.step)
            );
            sortedSteps = [...newRemaining].sort((a, b) =>
              a.priority !== b.priority
                ? a.priority - b.priority
                : a.step - b.step
            );

            console.log(
              `✅ Replan complete. ${sortedSteps.length} steps remaining in new plan.`
            );
          }
        }
      }

      if (iterations >= MAX_ITERATIONS && sortedSteps.length > 0) {
        console.warn(`\n⚠️ Maximum iterations (${MAX_ITERATIONS}) reached. Halting execution.`);
        trace.addError(`Max iterations (${MAX_ITERATIONS}) reached`);
      }

      // ── Finalize ───────────────────────────────────────────────
      const duration = Math.round((Date.now() - startTime) / 1000);
      const finalTrace = trace.finalize("completed");
      await this.persistTrace(finalTrace, entity.id);

      console.log(`\n✅ ============================================`);
      console.log(`✅ INVESTIGATION COMPLETE`);
      console.log(`✅ Duration: ${duration} seconds`);
      console.log(`✅ Steps executed: ${completedSteps.size}/${sortedSteps.length}`);
      console.log(`✅ ============================================\n`);

      return {
        investigationId,
        entity,
        status: "completed",
        findings: ctx.findings,
        analysis: ctx.analysis,
        recommendations: ctx.recommendations,
        relationships: ctx.relationships,
        networkAnalysis: ctx.networkAnalysis,
        graphData: ctx.graphData,
        deepAnalysis: ctx.deepAnalysis,
        trace: finalTrace,
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

      trace.addError(`${err.name}: ${err.message}`);
      const finalTrace = trace.finalize("failed");
      await this.persistTrace(finalTrace);

      return {
        investigationId,
        entity: null as any,
        status: "failed",
        findings: { profiles: [], emails: [], domains: [], metadata: {} },
        recommendations: ["Investigation failed. Please try again."],
        trace: finalTrace,
        duration,
        createdAt: new Date(),
      };
    }
  }

  // ── Step Dispatch 
  private async executeStep(
    planStep: PlanStep,
    ctx: ExecutionContext,
    trace: TraceCollector
  ): Promise<StepResult> {
    const handler = this.registry.get(planStep.tool);

    console.log(
      `🔧 Step ${planStep.step}: ${planStep.action} [${planStep.tool}]`
    );

    trace.startStep(planStep.step, planStep.tool);

    if (!handler) {
      const errorMsg = `Unknown tool: "${planStep.tool}"`;
      console.warn(`❌ ${errorMsg}`);
      trace.endStep("failed", {
        error: errorMsg,
        resultSummary: errorMsg,
      });
      return { status: "failed", summary: errorMsg, error: errorMsg };
    }

    try {
      const result = await executeWithTimeout(
        () => handler.execute(ctx, this.deps),
        DEFAULT_STEP_TIMEOUT_MS,
        planStep.tool
      );

      trace.endStep(result.status, {
        agentName: handler.name,
        confidenceAfter: result.confidence,
        toolCalls: [planStep.tool],
        resultSummary: result.summary,
        error: result.error,
      });

      return result;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(
        `⚠️ Step ${planStep.step} (${planStep.tool}) failed: ${errMsg}`
      );
      trace.endStep("failed", {
        agentName: handler.name,
        toolCalls: [planStep.tool],
        resultSummary: `Failed: ${errMsg}`,
        error: errMsg,
      });
      return { status: "failed", summary: `Failed: ${errMsg}`, error: errMsg };
    }
  }

  // ── Helpers 
  private async persistTrace(
    traceData: InvestigationTrace,
    entityId?: number
  ): Promise<void> {
    try {
      await db.insert(investigationTraces).values({
        id: traceData.traceId,
        userId: traceData.userId,
        entityId: entityId && entityId !== -1 ? entityId : null,
        target: traceData.target,
        status: traceData.status,
        planVersion: traceData.planVersion,
        steps: traceData.steps as any,
        errors: traceData.errors as any,
        replanEvents: traceData.replanEvents as any,
        totalLatencyMs: traceData.totalLatencyMs,
        startedAt: traceData.startedAt,
        completedAt: traceData.completedAt,
      });
      console.log(`📊 Trace persisted: ${traceData.traceId}`);
    } catch (error) {
      console.warn(
        `⚠️ Failed to persist trace (non-fatal):`,
        error instanceof Error ? error.message : error
      );
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
}