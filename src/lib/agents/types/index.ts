import { z } from "zod";
import type { DiscoveredRelationship, NetworkAnalysis } from "../relationship-agent";
import type { AnalysisResult } from "../analysis-agent";

// Intent Schema
export const IntentSchema = z.object({
  target: z.string().describe("The target to investigate (username, email, domain, etc.)"),
  targetType: z.enum(["username", "email", "domain", "ip", "phone", "person", "organization"])
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
  contentAnalysis?: import("../tools/analysis-tools").ContentAnalysis;
  investigationId: string;
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

// OSINT Target used in iterative queue
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
  contentData?: import("../tools/content-scraper").ScrapedContent[];
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
  recommendations?: string[];
  contentAnalysis?: import("../tools/analysis-tools").ContentAnalysis;
  relationships?: DiscoveredRelationship[];
  networkAnalysis?: NetworkAnalysis;
  graphData?: { nodes: any[]; edges: any[] };
  deepAnalysis?: AnalysisResult;
  duration: number; // in seconds
  createdAt: Date;
}
