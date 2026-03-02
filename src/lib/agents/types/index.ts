import { z } from "zod";
import type { DiscoveredRelationship, NetworkAnalysis } from "../relationship-agent";
import type { AnalysisResult } from "../analysis-agent";

// Intent Schema (updated with metadata)
export const IntentSchema = z.object({
  target: z.string().describe("The target to investigate (username, email, domain, etc.)"),
  targetType: z.enum(["username", "email", "domain", "ip", "person", "organization"])
    .describe("Type of target"),
  intent: z.enum(["investigate", "monitor", "analyze", "search"])
    .describe("What the user wants to do"),
  scope: z.enum(["quick", "standard", "deep"])
    .describe("How thorough the investigation should be"),
  metadata: z.object({
    suggestedUsername: z.string().optional(),
    alternativeNames: z.array(z.string()).optional(),
  }).optional(),
});

export type Intent = z.infer<typeof IntentSchema>;

// Investigation Plan Schema
export const PlanStepSchema = z.object({
  step: z.number().describe("Step number in sequence"),
  action: z.string().describe("What action to take"),
  tool: z.string().describe("Which tool/function to use"),
  priority: z.number().min(1).describe("Priority level (1=highest)"),
  dependsOn: z.number().optional().describe("Step number this depends on"),
});

export const InvestigationPlanSchema = z.object({
  steps: z.array(PlanStepSchema),
  estimatedDuration: z.string().describe("Estimated time to complete"),
});
export type PlanStep = z.infer<typeof PlanStepSchema>;
export type InvestigationPlan = z.infer<typeof InvestigationPlanSchema>;

// Step Execution Results
export interface StepResult {
  status: "success" | "failed" | "skipped";
  summary: string;
  confidence?: number;
  error?: string;
}

// Execution Context — mutable bag that accumulates results across steps
export interface ExecutionContext {
  intent: Intent;
  entity: any;
  findings: OsintFindings;
  analysis?: { riskScore: number; insights: string[]; summary: string };
  recommendations?: string[];
  relationships?: any;
  networkAnalysis?: any;
  graphData?: any;
  deepAnalysis?: any;
  [key: string]: any;
}

// Tool Handler — registry entry for a single tool
export interface ToolHandler {
  name: string;
  execute(ctx: ExecutionContext, deps: ToolDependencies): Promise<StepResult>;
}

// Dependencies injected into tool handlers
export interface ToolDependencies {
  llm: any;
  db: any;
  osintAgent: any;
  relationshipAgent: any;
  analysisAgent: any;
}

// Task for agents
export interface Task {
  entityId: string;
  description: string;
  target: string;
  metadata?: Record<string, any>;
}

// Agent Result
export interface AgentResult {
  agentName: string;
  success: boolean;
  data?: any;
  error?: string;
  confidence?: number;
}

// OSINT Target used in iteractive queue
export interface OsintTarget {
  term: string;
  type: "person" | "username" | "email" | "domain" | "phone";
  depth: number;
  parent?: string;
  /** When set, username searches only check these platforms (used for gap-filling after person search). */
  targetPlatforms?: string[];
}

// OSINT Findings
export interface OsintFindings {
  profiles: Array<{
    confidence: string;
    platform: string;
    url: string;
    found: boolean;
    username?: string;
    data?: any;
    provenance?: { sourceTarget: string; pivotDepth: number };
  }>;
  emails: Array<{ address: string; provenance?: { sourceTarget: string; pivotDepth: number }; data?: any }>;
  domains: Array<{ domain: string; provenance?: { sourceTarget: string; pivotDepth: number }; data?: any }>;
  phones?: Array<{ number: string; provenance?: { sourceTarget: string; pivotDepth: number }; data?: any }>;
  webResults?: Array<{ title: string; url: string; snippet: string }>;
  metadata: Record<string, any>;
}

// Execution Trace — step-level telemetry
export interface TraceStep {
  stepNumber: number;
  name: string;
  status: "success" | "failed" | "skipped";
  latencyMs: number;
  agentName?: string;
  confidenceBefore?: number;
  confidenceAfter?: number;
  toolCalls?: string[];
  resultSummary?: string;
  error?: string;
}

export interface ReplanEvent {
  stepNumber: number;
  reason: string;
  previousPlanVersion: number;
  newPlanVersion: number;
  confidenceScore?: number;
}

export interface ReflectionResult {
  needsReplan: boolean;
  reason: string;
  confidenceScore: number;
}

export interface InvestigationTrace {
  traceId: string;
  userId: string;
  target: string;
  planVersion: number;
  steps: TraceStep[];
  totalLatencyMs: number;
  status: "completed" | "failed" | "partial";
  errors: string[];
  replanEvents?: ReplanEvent[];
  startedAt: Date;
  completedAt: Date;
}

// Investigation Result (final output)
export interface InvestigationResult {
  investigationId: string;
  entity: any;
  status: "completed" | "failed" | "partial";
  findings: OsintFindings;
  analysis?: {
    riskScore: number;
    insights: string[];
    summary: string;
  };
  recommendations?: string[];
  relationships?: DiscoveredRelationship[];
  networkAnalysis?: NetworkAnalysis;
  graphData?: { nodes: any[]; edges: any[] };
  deepAnalysis?: AnalysisResult;
  trace?: InvestigationTrace;
  duration: number; // in seconds
  createdAt: Date;
}