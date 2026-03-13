import jsPDF from "jspdf";

// ── Deep Analysis Types (mirrored from analysis-tools.ts for client-side use) ──

export interface BehaviorProfileData {
    activityLevel: "very_high" | "high" | "moderate" | "low" | "minimal";
    digitalFootprint: {
        size: "extensive" | "moderate" | "limited" | "minimal";
        platforms: Array<{
            name: string;
            category: "social" | "professional" | "tech" | "media" | "other";
            activityIndicators: string[];
            lastSeen?: string;
        }>;
        totalPlatforms: number;
        primaryCategories: string[];
    };
    securityPosture: {
        level: "strong" | "moderate" | "weak" | "poor";
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
    };
    engagementPatterns: {
        platformDiversity: number;
        professionalPresence: number;
        socialPresence: number;
        techPresence: number;
        estimatedActiveHours: string;
    };
    behavioralFlags: Array<{
        flag: string;
        severity: "high" | "medium" | "low";
        description: string;
    }>;
    profileSummary: string;
}

export interface TimelineEventData {
    timestamp: string | Date;
    eventType: "profile_discovery" | "breach" | "relationship" | "activity" | "alert";
    title: string;
    description: string;
    platform?: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    metadata?: Record<string, any>;
}

export interface DigitalFootprintData {
    overview: {
        totalPlatforms: number;
        totalRelationships: number;
        exposureLevel: "critical" | "high" | "moderate" | "low" | "minimal";
        visibilityScore: number;
        lastUpdated: string | Date;
    };
    platformBreakdown: {
        social: { count: number; platforms: string[] };
        professional: { count: number; platforms: string[] };
        technical: { count: number; platforms: string[] };
        other: { count: number; platforms: string[] };
    };
    exposureMetrics: {
        publicProfiles: number;
        privateProfiles: number;
        verifiedAccounts: number;
        dormantAccounts: number;
    };
    riskAreas: Array<{
        area: string;
        risk: "high" | "medium" | "low";
        details: string;
        mitigation: string;
    }>;
    growthTrend: {
        direction: "increasing" | "stable" | "decreasing";
        rate: string;
        analysis: string;
    };
    watchdogAlerts: Array<{
        alertType: "new_profile" | "breach" | "suspicious_activity" | "exposure_increase";
        severity: "critical" | "high" | "medium" | "low";
        message: string;
        timestamp: string | Date;
        actionable: boolean;
    }>;
}

export interface GeneratedInsightData {
    category: "security" | "privacy" | "reputation" | "operational" | "strategic";
    priority: "critical" | "high" | "medium" | "low";
    insight: string;
    evidence: string[];
    recommendation: string;
    impact: string;
}

export interface DeepAnalysisData {
    behaviorProfile: BehaviorProfileData;
    timeline: TimelineEventData[];
    digitalFootprint: DigitalFootprintData;
    insights: GeneratedInsightData[];
    summary: string;
    confidence: number;
    analysisDate: string | Date;
}

export interface ProfileResult {
    platform: string;
    url: string;
    found: boolean;
    confidence?: "high" | "medium" | "low";
    username?: string;
    data?: any;
}

export interface InvestigationData {
    investigationId: string;
    entity: { id: number; name: string; type: string };
    status: "completed" | "failed" | "partial";
    findings: {
        profiles: ProfileResult[];
        emails: Array<string | { address: string; data?: any }>;
        domains: Array<string | { domain: string; data?: any }>;
        phones?: Array<{ number: string; data?: any }>;
        webResults?: Array<{ title: string; url: string; snippet: string }>;
        metadata: Record<string, any>;
    };
    analysis?: { riskScore: number; insights: string[]; summary: string };
    recommendations?: string[];
    relationships?: any[];
    networkAnalysis?: any;
    contentAnalysis?: {
        topTopics: Array<{ topic: string; frequency: number; platforms: string[] }>;
        sentiment: "positive" | "neutral" | "negative" | "mixed";
        interests: string[];
        activityPatterns: {
            mostActivePlatform: string;
            totalPostsAnalyzed: number;
            contentTypes: string[];
        };
        languagesUsed: string[];
        redFlags: Array<{ flag: string; evidence: string; severity: "high" | "medium" | "low" }>;
    };
    deepAnalysis?: DeepAnalysisData;
    duration: number;
    createdAt: string;
}

// ── Color Palette ──

export type RGB = [number, number, number];

export const COLORS = {
    primary: [0, 130, 40] as RGB,
    heading: [20, 20, 25] as RGB,
    body: [50, 50, 55] as RGB,
    muted: [120, 120, 130] as RGB,
    white: [255, 255, 255] as RGB,
    red: [200, 40, 40] as RGB,
    yellow: [180, 130, 0] as RGB,
    green: [20, 150, 60] as RGB,
    blue: [40, 90, 200] as RGB,
    cyan: [0, 130, 160] as RGB,
    orange: [220, 120, 0] as RGB,
    sectionBg: [240, 245, 240] as RGB,
    statBg: [245, 247, 250] as RGB,
    border: [210, 215, 220] as RGB,
    altRow: [248, 250, 252] as RGB,
};

// ── Section Renderer Signature ──

export type SectionRenderer = (
    doc: jsPDF,
    data: InvestigationData,
    y: number,
    contentWidth: number,
) => number;
