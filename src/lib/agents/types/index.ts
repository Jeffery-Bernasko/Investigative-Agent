import { z } from "zod";
import type { DiscoveredRelationship, NetworkAnalysis } from "../relationship-agent";

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
});

export const InvestigationPlanSchema = z.object({
  steps: z.array(PlanStepSchema),
  estimatedDuration: z.string().describe("Estimated time to complete"),
});

export type PlanStep = z.infer<typeof PlanStepSchema>;
export type InvestigationPlan = z.infer<typeof InvestigationPlanSchema>;

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

// OSINT Findings
export interface OsintFindings {
  profiles: Array<{
    confidence: string;
    platform: string;
    url: string;
    found: boolean;
    username?: string;
    data?: any;
  }>;
  emails: string[];
  domains: string[];
  webResults?: Array<{ title: string; url: string; snippet: string }>;
  metadata: Record<string, any>;
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
  recommendations: string[];
  relationships?: DiscoveredRelationship[];
  networkAnalysis?: NetworkAnalysis;
  graphData?: { nodes: any[]; edges: any[] };
  duration: number; // in seconds
  createdAt: Date;
}