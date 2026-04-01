import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Types (mirrors the InvestigationResult used in investigate-form) ──

// ── Deep Analysis Types (mirrored from analysis-tools.ts for client-side use) ──
interface BehaviorProfileData {
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

interface TimelineEventData {
    timestamp: string | Date;
    eventType: "profile_discovery" | "breach" | "relationship" | "activity" | "alert";
    title: string;
    description: string;
    platform?: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    metadata?: Record<string, any>;
}

interface DigitalFootprintData {
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

interface GeneratedInsightData {
    category: "security" | "privacy" | "reputation" | "operational" | "strategic";
    priority: "critical" | "high" | "medium" | "low";
    insight: string;
    evidence: string[];
    recommendation: string;
    impact: string;
}

interface DeepAnalysisData {
    behaviorProfile: BehaviorProfileData;
    timeline: TimelineEventData[];
    digitalFootprint: DigitalFootprintData;
    insights: GeneratedInsightData[];
    summary: string;
    confidence: number;
    analysisDate: string | Date;
}

interface ProfileResult {
    platform: string;
    url: string;
    found: boolean;
    confidence?: "high" | "medium" | "low";
    username?: string;
    avatarUrl?: string;
    avatarData?: string;
    data?: any;
}

interface InvestigationData {
    investigationId: string;
    entity: { id: number; name: string; type: string };
    status: "completed" | "failed" | "partial";
    findings: {
        profiles: ProfileResult[];
        emails: Array<string | { address: string; data?: any }>;
        domains: Array<string | { domain: string; data?: any }>;
        phones?: Array<{ number: string; data?: any }>;
        webResults?: Array<{ title: string; url: string; snippet: string }>;
        personalWebsites?: Array<{ url: string; title: string; snippet: string }>;
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

const COLORS = {
    primary: [0, 130, 40] as [number, number, number],        // deep green
    heading: [20, 20, 25] as [number, number, number],         // near-black for headings
    body: [50, 50, 55] as [number, number, number],            // dark gray for body text
    muted: [120, 120, 130] as [number, number, number],        // muted for secondary text
    white: [255, 255, 255] as [number, number, number],
    red: [200, 40, 40] as [number, number, number],
    yellow: [180, 130, 0] as [number, number, number],
    green: [20, 150, 60] as [number, number, number],
    blue: [40, 90, 200] as [number, number, number],
    cyan: [0, 130, 160] as [number, number, number],
    sectionBg: [240, 245, 240] as [number, number, number],    // very light green tint
    statBg: [245, 247, 250] as [number, number, number],       // very light blue-gray
    border: [210, 215, 220] as [number, number, number],       // light border
    altRow: [248, 250, 252] as [number, number, number],       // zebra stripe for tables
};

// ── Helpers
function severityColor(severity: string): [number, number, number] {
    switch (severity) {
        case "critical": return COLORS.red;
        case "high": return [220, 120, 0]; // orange
        case "medium": return COLORS.yellow;
        case "low": return COLORS.green;
        default: return COLORS.muted;
    }
}

function exposureColor(level: string): [number, number, number] {
    switch (level) {
        case "critical": return COLORS.red;
        case "high": return [220, 120, 0];
        case "moderate": return COLORS.yellow;
        case "low": return COLORS.green;
        case "minimal": return COLORS.muted;
        default: return COLORS.muted;
    }
}

function categoryColor(category: string): [number, number, number] {
    switch (category) {
        case "security": return COLORS.red;
        case "privacy": return COLORS.blue;
        case "reputation": return COLORS.cyan;
        case "operational": return COLORS.yellow;
        case "strategic": return COLORS.green;
        default: return COLORS.muted;
    }
}

function riskColor(score: number): [number, number, number] {
    if (score >= 7) return COLORS.red;
    if (score >= 4) return COLORS.yellow;
    return COLORS.green;
}

function riskLabel(score: number): string {
    if (score >= 7) return "HIGH RISK";
    if (score >= 4) return "MEDIUM RISK";
    return "LOW RISK";
}

function confidenceLabel(c?: string): string {
    if (c === "high") return "HIGH";
    if (c === "medium") return "MEDIUM";
    return "LOW";
}

function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleString("en-US", {
            year: "numeric", month: "long", day: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    } catch {
        return dateStr;
    }
}

function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text("SEPTO — Security & Entity Profiling Threat Observatory", 20, pageHeight - 9);
    doc.text("CONFIDENTIAL", pageWidth / 2, pageHeight - 9, { align: "center" });
    doc.text(`Page ${pageNum} / ${totalPages}`, pageWidth - 20, pageHeight - 9, { align: "right" });
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - 25) {
        doc.addPage();
        return 30;
    }
    return y;
}

function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    y = checkPageBreak(doc, y, 18);
    doc.setFillColor(...COLORS.sectionBg);
    doc.roundedRect(20, y, pageWidth - 40, 12, 2, 2, "F");
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(20, y, pageWidth - 40, 12, 2, 2, "S");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text(title.toUpperCase(), 26, y + 8);
    return y + 18;
}

// ── Main Export
export function generateInvestigationReport(data: InvestigationData): void {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - 40;

    // PAGE 1 — COVER / HEADER
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 4, "F");

    // Title block
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.heading);
    doc.text("SEPTO", 20, 30);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text("Security & Entity Profiling Threat Observatory", 20, 37);

    // Horizontal rule
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(20, 42, pageWidth - 20, 42);

    // Report title — rebranded
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.heading);
    doc.text("Digital Footprint Summary", 20, 55);

    // Target info box
    doc.setFillColor(...COLORS.statBg);
    doc.roundedRect(20, 62, contentWidth, 28, 3, 3, "F");
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(20, 62, contentWidth, 28, 3, 3, "S");

    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text("TARGET", 28, 72);
    doc.text("TYPE", 28, 82);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.heading);
    doc.text(data.entity.name, 55, 72);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.body);
    doc.text(data.entity.type.charAt(0).toUpperCase() + data.entity.type.slice(1), 55, 82);

    // Meta line — explicitly reset font to guard against state from entity name render
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Report ID: ${data.investigationId}`, 28, 95);
    doc.text(`Generated: ${formatDate(data.createdAt)}`, pageWidth / 2, 95, { align: "center" });
    doc.text(`Duration: ${data.duration}s`, pageWidth - 28, 95, { align: "right" });

    doc.text(`Status: ${data.status.toUpperCase()}`, 28, 101);

    let y = 106;

    // SUBJECT SNAPSHOT (from deep analysis)
    if (data.deepAnalysis) {
        const da = data.deepAnalysis;
        const bp = da.behaviorProfile;
        const df = da.digitalFootprint;

        const snapshotBoxHeight = 32;
        y = checkPageBreak(doc, y, snapshotBoxHeight + 4);

        // Background box
        doc.setFillColor(...COLORS.sectionBg);
        doc.roundedRect(20, y, contentWidth, snapshotBoxHeight, 3, 3, "F");
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(20, y, contentWidth, snapshotBoxHeight, 3, 3, "S");

        // Section label
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.primary);
        doc.text("SUBJECT SNAPSHOT", 26, y + 6);

        // Row of key metrics
        const metricY = y + 14;
        const metricSpacing = contentWidth / 5;

        // 1. Activity Level
        const activityLabel = bp.activityLevel.replace("_", " ").toUpperCase();
        const activityColor = bp.activityLevel === "very_high" || bp.activityLevel === "high"
            ? [220, 120, 0] as [number, number, number]
            : bp.activityLevel === "moderate"
                ? COLORS.yellow
                : COLORS.green;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...activityColor);
        doc.text(activityLabel, 26, metricY);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text("Activity Level", 26, metricY + 5);

        // 2. Footprint Size
        const sizeLabel = bp.digitalFootprint.size.toUpperCase();
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.heading);
        doc.text(sizeLabel, 26 + metricSpacing, metricY);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text("Footprint Size", 26 + metricSpacing, metricY + 5);

        // 3. Exposure Level
        const expLevel = df.overview.exposureLevel.toUpperCase();
        const expColor = exposureColor(df.overview.exposureLevel);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...expColor);
        doc.text(expLevel, 26 + metricSpacing * 2, metricY);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text("Exposure Level", 26 + metricSpacing * 2, metricY + 5);

        // 4. Visibility Score
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.primary);
        doc.text(`${df.overview.visibilityScore}/100`, 26 + metricSpacing * 3, metricY);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text("Visibility Score", 26 + metricSpacing * 3, metricY + 5);

        // 5. Confidence
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.cyan);
        doc.text(`${da.confidence}%`, 26 + metricSpacing * 4, metricY);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text("Confidence", 26 + metricSpacing * 4, metricY + 5);

        // Thin accent line at bottom of snapshot
        doc.setDrawColor(...COLORS.primary);
        doc.setLineWidth(0.4);
        doc.line(24, y + snapshotBoxHeight - 3, pageWidth - 24, y + snapshotBoxHeight - 3);

        y += snapshotBoxHeight + 6;
    } else {
        y += 6;
    }

    // EXECUTIVE SUMMARY
    y = drawSectionHeader(doc, "Executive Summary", y);

    // Risk score badge (inline)
    if (data.analysis) {
        const rc = riskColor(data.analysis.riskScore);
        doc.setFillColor(...rc);
        doc.roundedRect(20, y, 36, 12, 2, 2, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.white);
        doc.text(`Risk: ${data.analysis.riskScore}/10`, 23, y + 8);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...rc);
        doc.text(riskLabel(data.analysis.riskScore), 60, y + 8);

        // Confidence badge (from deep analysis) — rendered next to risk
        if (data.deepAnalysis) {
            doc.setFillColor(...COLORS.cyan);
            doc.roundedRect(100, y, 40, 12, 2, 2, "F");
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.white);
            doc.text(`Conf: ${data.deepAnalysis.confidence}%`, 103, y + 8);
        }

        y += 18;

        // Summary text — prefer deep analysis summary when available
        const summaryText = data.deepAnalysis?.summary || data.analysis.summary;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.body);
        const summaryLines = doc.splitTextToSize(summaryText, contentWidth);
        doc.text(summaryLines, 20, y);
        y += summaryLines.length * 4.5 + 4;

        // Analysis date line (from deep analysis)
        if (data.deepAnalysis?.analysisDate) {
            doc.setFontSize(7);
            doc.setTextColor(...COLORS.muted);
            doc.setFont("helvetica", "italic");
            doc.text(
                `Analysis performed: ${formatDate(typeof data.deepAnalysis.analysisDate === "string" ? data.deepAnalysis.analysisDate : data.deepAnalysis.analysisDate.toString())}`,
                20, y
            );
            y += 5;
        }
    } else {
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.body);
        doc.text("Analysis was not performed for this investigation.", 20, y);
        y += 8;
    }

    // Quick stats row — expanded
    y = checkPageBreak(doc, y, 22);
    const stats: Array<{ label: string; value: string; color: [number, number, number] }> = [
        { label: "Profiles", value: String(data.findings.profiles.length), color: COLORS.primary },
        { label: "High Conf.", value: String(data.findings.profiles.filter(p => p.confidence === "high").length), color: COLORS.green },
        { label: "Emails", value: String(data.findings.emails?.length || 0), color: COLORS.yellow },
        { label: "Domains", value: String(data.findings.domains?.length || 0), color: COLORS.blue },
        { label: "Phones", value: String(data.findings.phones?.length || 0), color: COLORS.cyan },
    ];

    // Add visibility score as a stat if deep analysis is available
    if (data.deepAnalysis) {
        stats.push({
            label: "Visibility",
            value: `${data.deepAnalysis.digitalFootprint.overview.visibilityScore}/100`,
            color: exposureColor(data.deepAnalysis.digitalFootprint.overview.exposureLevel),
        });
    }

    const statW = contentWidth / stats.length;
    stats.forEach((s, i) => {
        const x = 20 + i * statW;
        doc.setFillColor(...COLORS.statBg);
        doc.roundedRect(x + 1, y, statW - 2, 18, 2, 2, "F");
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(x + 1, y, statW - 2, 18, 2, 2, "S");
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...s.color);
        doc.text(s.value, x + statW / 2, y + 10, { align: "center" });
        doc.setFontSize(6);
        doc.setTextColor(...COLORS.muted);
        doc.text(s.label, x + statW / 2, y + 15, { align: "center" });
    });
    y += 24;

    // SUBJECT BEHAVIORAL PROFILE (from deep analysis)
    if (data.deepAnalysis) {
        const bp = data.deepAnalysis.behaviorProfile;

        y = drawSectionHeader(doc, "Subject Behavioral Profile", y);

        // ── Activity Level Badge + Profile Summary ──
        y = checkPageBreak(doc, y, 20);

        // Activity level badge
        const activityLabel = bp.activityLevel.replace("_", " ").toUpperCase();
        const activityBadgeColor = bp.activityLevel === "very_high"
            ? COLORS.red
            : bp.activityLevel === "high"
                ? [220, 120, 0] as [number, number, number]
                : bp.activityLevel === "moderate"
                    ? COLORS.yellow
                    : COLORS.green;

        doc.setFillColor(...activityBadgeColor);
        doc.roundedRect(20, y, 44, 10, 2, 2, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.white);
        doc.text(activityLabel, 23, y + 7);

        // Footprint size badge next to it
        doc.setFillColor(...COLORS.primary);
        doc.roundedRect(68, y, 40, 10, 2, 2, "F");
        doc.setTextColor(...COLORS.white);
        doc.text(`${bp.digitalFootprint.size.toUpperCase()} FOOTPRINT`, 71, y + 7);

        // Platform count inline
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.body);
        doc.text(
            `${bp.digitalFootprint.totalPlatforms} platform(s) detected`,
            114, y + 7
        );

        y += 14;

        // Profile summary paragraph
        y = checkPageBreak(doc, y, 12);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.body);
        const profileSummaryLines = doc.splitTextToSize(bp.profileSummary, contentWidth);
        doc.text(profileSummaryLines, 20, y);
        y += profileSummaryLines.length * 4 + 4;

        // ── Security Posture ──
        y = checkPageBreak(doc, y, 30);

        // Sub-header
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.heading);
        doc.text("Security Posture", 20, y);

        // Security level badge
        const secLevel = bp.securityPosture.level;
        const secColor = secLevel === "strong"
            ? COLORS.green
            : secLevel === "moderate"
                ? COLORS.yellow
                : secLevel === "weak"
                    ? [220, 120, 0] as [number, number, number]
                    : COLORS.red;

        doc.setFillColor(...secColor);
        doc.roundedRect(60, y - 4, 28, 8, 2, 2, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.white);
        doc.text(secLevel.toUpperCase(), 63, y + 1);

        y += 8;

        // Strengths
        if (bp.securityPosture.strengths.length > 0) {
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.green);
            doc.text("STRENGTHS", 20, y);
            y += 4;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...COLORS.body);
            bp.securityPosture.strengths.forEach((s) => {
                y = checkPageBreak(doc, y, 6);
                doc.setFontSize(7);
                doc.setTextColor(...COLORS.green);
                doc.text("+", 22, y);
                doc.setTextColor(...COLORS.body);
                const lines = doc.splitTextToSize(s, contentWidth - 12);
                doc.text(lines, 28, y);
                y += lines.length * 3.5 + 1.5;
            });
            y += 2;
        }

        // Weaknesses
        if (bp.securityPosture.weaknesses.length > 0) {
            y = checkPageBreak(doc, y, 8);
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.red);
            doc.text("WEAKNESSES", 20, y);
            y += 4;
            doc.setFont("helvetica", "normal");
            bp.securityPosture.weaknesses.forEach((w) => {
                y = checkPageBreak(doc, y, 6);
                doc.setFontSize(7);
                doc.setTextColor(...COLORS.red);
                doc.text("−", 22, y);
                doc.setTextColor(...COLORS.body);
                const lines = doc.splitTextToSize(w, contentWidth - 12);
                doc.text(lines, 28, y);
                y += lines.length * 3.5 + 1.5;
            });
            y += 2;
        }

        // Security Recommendations
        if (bp.securityPosture.recommendations.length > 0) {
            y = checkPageBreak(doc, y, 8);
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.blue);
            doc.text("SECURITY RECOMMENDATIONS", 20, y);
            y += 4;
            doc.setFont("helvetica", "normal");
            bp.securityPosture.recommendations.forEach((r) => {
                y = checkPageBreak(doc, y, 6);
                doc.setFontSize(7);
                doc.setTextColor(...COLORS.blue);
                doc.text("->", 22, y);
                doc.setTextColor(...COLORS.body);
                const lines = doc.splitTextToSize(r, contentWidth - 12);
                doc.text(lines, 28, y);
                y += lines.length * 3.5 + 1.5;
            });
            y += 2;
        }

        // ── Engagement Patterns ──
        y = checkPageBreak(doc, y, 28);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.heading);
        doc.text("Engagement Patterns", 20, y);
        y += 6;

        const engPatterns = bp.engagementPatterns;
        const patternStats = [
            { label: "Platform Diversity", value: `${Math.round(engPatterns.platformDiversity)}%` },
            { label: "Social", value: `${Math.round(engPatterns.socialPresence)}%` },
            { label: "Professional", value: `${Math.round(engPatterns.professionalPresence)}%` },
            { label: "Technical", value: `${Math.round(engPatterns.techPresence)}%` },
            { label: "Active Hours", value: engPatterns.estimatedActiveHours },
        ];

        const patW = contentWidth / patternStats.length;
        patternStats.forEach((ps, i) => {
            const x = 20 + i * patW;
            doc.setFillColor(...COLORS.statBg);
            doc.roundedRect(x + 1, y, patW - 2, 16, 2, 2, "F");
            doc.setDrawColor(...COLORS.border);
            doc.roundedRect(x + 1, y, patW - 2, 16, 2, 2, "S");

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.primary);
            doc.text(ps.value, x + patW / 2, y + 8, { align: "center" });

            doc.setFontSize(5.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...COLORS.muted);
            doc.text(ps.label, x + patW / 2, y + 13, { align: "center" });
        });
        y += 22;

        // ── Behavioral Flags ──
        if (bp.behavioralFlags.length > 0) {
            y = checkPageBreak(doc, y, 14);

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.heading);
            doc.text("Behavioral Flags", 20, y);
            y += 6;

            autoTable(doc, {
                startY: y,
                margin: { left: 20, right: 20 },
                head: [["#", "Flag", "Severity", "Description"]],
                body: bp.behavioralFlags.map((f, i) => [
                    String(i + 1),
                    f.flag,
                    f.severity.toUpperCase(),
                    f.description,
                ]),
                theme: "grid",
                styles: {
                    fontSize: 7,
                    cellPadding: 2.5,
                    textColor: COLORS.body,
                    lineColor: COLORS.border,
                    lineWidth: 0.2,
                },
                headStyles: {
                    fillColor: COLORS.primary,
                    textColor: COLORS.white,
                    fontStyle: "bold",
                    fontSize: 7,
                },
                alternateRowStyles: { fillColor: COLORS.altRow },
                columnStyles: {
                    0: { cellWidth: 8, halign: "center" },
                    1: { cellWidth: 30, fontStyle: "bold" },
                    2: { cellWidth: 20, halign: "center" },
                    3: { cellWidth: "auto" },
                },
                didParseCell: (hookData: any) => {
                    if (hookData.section === "body" && hookData.column.index === 2) {
                        const text = hookData.cell.raw as string;
                        if (text === "HIGH") hookData.cell.styles.textColor = COLORS.red;
                        else if (text === "MEDIUM") hookData.cell.styles.textColor = COLORS.yellow;
                        else hookData.cell.styles.textColor = COLORS.green;
                    }
                },
            });

            y = (doc as any).lastAutoTable.finalY + 6;
        }

        // Add spacing before next section
        y += 2;
    }

    // DIGITAL EXPOSURE ANALYSIS (from deep analysis)
    if (data.deepAnalysis) {
        const df = data.deepAnalysis.digitalFootprint;

        y = drawSectionHeader(doc, "Digital Exposure Analysis", y);

        // ── Exposure Overview Row ──
        y = checkPageBreak(doc, y, 22);

        // Exposure level badge
        const expColor = exposureColor(df.overview.exposureLevel);
        doc.setFillColor(...expColor);
        doc.roundedRect(20, y, 46, 12, 2, 2, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.white);
        doc.text(df.overview.exposureLevel.toUpperCase(), 23, y + 8);

        // Visibility score bar
        const barX = 72;
        const barW = 60;
        const barH = 8;
        const barY = y + 2;
        const fillW = Math.max(1, (df.overview.visibilityScore / 100) * barW);

        // Bar background
        doc.setFillColor(...COLORS.statBg);
        doc.roundedRect(barX, barY, barW, barH, 2, 2, "F");
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(barX, barY, barW, barH, 2, 2, "S");

        // Bar fill
        const barColor = df.overview.visibilityScore > 70
            ? COLORS.red
            : df.overview.visibilityScore > 40
                ? COLORS.yellow
                : COLORS.green;
        doc.setFillColor(...barColor);
        doc.roundedRect(barX, barY, fillW, barH, 2, 2, "F");

        // Score label on the bar
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...(fillW > 20 ? COLORS.white : COLORS.heading));
        doc.text(
            `${df.overview.visibilityScore}/100`,
            barX + barW / 2,
            barY + 5.5,
            { align: "center" }
        );

        // Label beneath the bar
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text("Visibility Score", barX, barY + barH + 4);

        // Summary stats inline
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.body);
        doc.text(
            `${df.overview.totalPlatforms} platforms  •  ${df.overview.totalRelationships} relationships`,
            barX + barW + 8, y + 8
        );

        y += 20;

        // ── Platform Breakdown Table ──
        y = checkPageBreak(doc, y, 16);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.heading);
        doc.text("Platform Breakdown", 20, y);
        y += 5;

        const breakdownRows: string[][] = [];
        const categories = [
            { key: "social", label: "Social", data: df.platformBreakdown.social },
            { key: "professional", label: "Professional", data: df.platformBreakdown.professional },
            { key: "technical", label: "Technical", data: df.platformBreakdown.technical },
            { key: "other", label: "Other", data: df.platformBreakdown.other },
        ];

        categories.forEach((cat) => {
            if (cat.data.count > 0) {
                breakdownRows.push([
                    cat.label,
                    String(cat.data.count),
                    cat.data.platforms.join(", ") || "—",
                ]);
            }
        });

        if (breakdownRows.length > 0) {
            autoTable(doc, {
                startY: y,
                margin: { left: 20, right: 20 },
                head: [["Category", "Count", "Platforms"]],
                body: breakdownRows,
                theme: "grid",
                styles: {
                    fontSize: 7,
                    cellPadding: 2.5,
                    textColor: COLORS.body,
                    lineColor: COLORS.border,
                    lineWidth: 0.2,
                },
                headStyles: {
                    fillColor: COLORS.primary,
                    textColor: COLORS.white,
                    fontStyle: "bold",
                    fontSize: 7,
                },
                alternateRowStyles: { fillColor: COLORS.altRow },
                columnStyles: {
                    0: { cellWidth: 28, fontStyle: "bold" },
                    1: { cellWidth: 14, halign: "center" },
                    2: { cellWidth: "auto" },
                },
                didParseCell: (hookData: any) => {
                    if (hookData.section === "body" && hookData.column.index === 0) {
                        const label = hookData.cell.raw as string;
                        if (label === "Social") hookData.cell.styles.textColor = COLORS.cyan;
                        else if (label === "Professional") hookData.cell.styles.textColor = COLORS.blue;
                        else if (label === "Technical") hookData.cell.styles.textColor = COLORS.primary;
                        else hookData.cell.styles.textColor = COLORS.muted;
                    }
                },
            });

            y = (doc as any).lastAutoTable.finalY + 6;
        }

        // ── Exposure Metrics Row ──
        y = checkPageBreak(doc, y, 26);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.heading);
        doc.text("Exposure Metrics", 20, y);
        y += 5;

        const expMetrics = [
            {
                label: "Public Profiles",
                value: String(df.exposureMetrics.publicProfiles),
                color: df.exposureMetrics.publicProfiles > 10 ? COLORS.red : COLORS.primary,
            },
            {
                label: "Verified Accounts",
                value: String(df.exposureMetrics.verifiedAccounts),
                color: COLORS.green,
            },
            {
                label: "Dormant Accounts",
                value: String(df.exposureMetrics.dormantAccounts),
                color: df.exposureMetrics.dormantAccounts > 5 ? COLORS.yellow : COLORS.muted,
            },
        ];

        const expW = contentWidth / expMetrics.length;
        expMetrics.forEach((em, i) => {
            const x = 20 + i * expW;
            doc.setFillColor(...COLORS.statBg);
            doc.roundedRect(x + 1, y, expW - 2, 16, 2, 2, "F");
            doc.setDrawColor(...COLORS.border);
            doc.roundedRect(x + 1, y, expW - 2, 16, 2, 2, "S");

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...em.color);
            doc.text(em.value, x + expW / 2, y + 8, { align: "center" });

            doc.setFontSize(6);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...COLORS.muted);
            doc.text(em.label, x + expW / 2, y + 13, { align: "center" });
        });
        y += 22;

        // ── Growth Trend ──
        y = checkPageBreak(doc, y, 14);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.heading);
        doc.text("Growth Trend", 20, y);

        // Direction indicator
        const trendArrow = df.growthTrend.direction === "increasing"
            ? "▲"
            : df.growthTrend.direction === "decreasing"
                ? "▼"
                : "■";
        const trendColor = df.growthTrend.direction === "increasing"
            ? COLORS.red
            : df.growthTrend.direction === "decreasing"
                ? COLORS.green
                : COLORS.muted;

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...trendColor);
        doc.text(
            `${trendArrow} ${df.growthTrend.direction.toUpperCase()}`,
            60, y
        );

        y += 5;

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.body);
        doc.text(df.growthTrend.rate, 20, y);
        y += 4;

        doc.setFontSize(7);
        doc.setTextColor(...COLORS.muted);
        doc.setFont("helvetica", "italic");
        const trendLines = doc.splitTextToSize(df.growthTrend.analysis, contentWidth);
        doc.text(trendLines, 20, y);
        y += trendLines.length * 3.5 + 4;

        // Add spacing before next section
        y += 2;
    }

    // RISK ASSESSMENT & WATCHDOG ALERTS (from deep analysis)
    if (data.deepAnalysis) {
        const df = data.deepAnalysis.digitalFootprint;
        const hasRiskAreas = df.riskAreas.length > 0;
        const hasAlerts = df.watchdogAlerts.length > 0;

        if (hasRiskAreas || hasAlerts) {
            y = drawSectionHeader(doc, "Risk Assessment & Alerts", y);

            // ── Risk Areas Table ──
            if (hasRiskAreas) {
                y = checkPageBreak(doc, y, 14);

                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...COLORS.heading);
                doc.text("Identified Risk Areas", 20, y);

                // Risk count badge
                const riskCountColor = df.riskAreas.some(r => r.risk === "high")
                    ? COLORS.red
                    : COLORS.yellow;
                doc.setFillColor(...riskCountColor);
                doc.roundedRect(70, y - 4, 20, 7, 2, 2, "F");
                doc.setFontSize(6);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...COLORS.white);
                doc.text(`${df.riskAreas.length} found`, 72, y);

                y += 5;

                autoTable(doc, {
                    startY: y,
                    margin: { left: 20, right: 20 },
                    head: [["#", "Risk Area", "Level", "Details", "Mitigation"]],
                    body: df.riskAreas
                        .sort((a, b) => {
                            const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
                            return (order[b.risk] || 0) - (order[a.risk] || 0);
                        })
                        .map((r, i) => [
                            String(i + 1),
                            r.area,
                            r.risk.toUpperCase(),
                            r.details,
                            r.mitigation,
                        ]),
                    theme: "grid",
                    styles: {
                        fontSize: 7,
                        cellPadding: 2.5,
                        textColor: COLORS.body,
                        lineColor: COLORS.border,
                        lineWidth: 0.2,
                    },
                    headStyles: {
                        fillColor: COLORS.primary,
                        textColor: COLORS.white,
                        fontStyle: "bold",
                        fontSize: 7,
                    },
                    alternateRowStyles: { fillColor: COLORS.altRow },
                    columnStyles: {
                        0: { cellWidth: 8, halign: "center" },
                        1: { cellWidth: 32, fontStyle: "bold" },
                        2: { cellWidth: 16, halign: "center" },
                        3: { cellWidth: "auto" },
                        4: { cellWidth: 40 },
                    },
                    didParseCell: (hookData: any) => {
                        if (hookData.section === "body" && hookData.column.index === 2) {
                            const text = hookData.cell.raw as string;
                            if (text === "HIGH") {
                                hookData.cell.styles.textColor = COLORS.red;
                                hookData.cell.styles.fontStyle = "bold";
                            } else if (text === "MEDIUM") {
                                hookData.cell.styles.textColor = COLORS.yellow;
                                hookData.cell.styles.fontStyle = "bold";
                            } else {
                                hookData.cell.styles.textColor = COLORS.green;
                            }
                        }
                        // Mitigation column in blue to signal actionability
                        if (hookData.section === "body" && hookData.column.index === 4) {
                            hookData.cell.styles.textColor = COLORS.blue;
                        }
                    },
                });

                y = (doc as any).lastAutoTable.finalY + 6;
            }

            // ── Watchdog Alerts ──
            if (hasAlerts) {
                y = checkPageBreak(doc, y, 14);

                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...COLORS.heading);
                doc.text("Watchdog Alerts", 20, y);

                // Alert count badge
                const criticalAlerts = df.watchdogAlerts.filter(a => a.severity === "critical").length;
                const alertBadgeColor = criticalAlerts > 0 ? COLORS.red : COLORS.yellow;
                doc.setFillColor(...alertBadgeColor);
                doc.roundedRect(62, y - 4, 24, 7, 2, 2, "F");
                doc.setFontSize(6);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...COLORS.white);
                doc.text(`${df.watchdogAlerts.length} alert(s)`, 64, y);

                y += 6;

                // Sort alerts: critical first, then high, medium, low
                const sortedAlerts = [...df.watchdogAlerts].sort((a, b) => {
                    const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
                    return (order[b.severity] || 0) - (order[a.severity] || 0);
                });

                sortedAlerts.forEach((alert) => {
                    y = checkPageBreak(doc, y, 16);

                    const alertColor = severityColor(alert.severity);

                    // Alert container
                    doc.setFillColor(...COLORS.statBg);
                    doc.roundedRect(20, y, contentWidth, 13, 2, 2, "F");
                    doc.setDrawColor(...COLORS.border);
                    doc.roundedRect(20, y, contentWidth, 13, 2, 2, "S");

                    // Severity accent bar on the left edge
                    doc.setFillColor(...alertColor);
                    doc.rect(20, y, 3, 13, "F");

                    // Severity badge
                    doc.setFillColor(...alertColor);
                    doc.roundedRect(26, y + 2, 20, 6, 1, 1, "F");
                    doc.setFontSize(5.5);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(...COLORS.white);
                    doc.text(alert.severity.toUpperCase(), 28, y + 6);

                    // Alert type label
                    doc.setFontSize(6);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(...COLORS.muted);
                    const typeLabel = alert.alertType.replace(/_/g, " ").toUpperCase();
                    doc.text(typeLabel, 50, y + 6);

                    // Actionable indicator
                    if (alert.actionable) {
                        doc.setFontSize(6);
                        doc.setFont("helvetica", "bold");
                        doc.setTextColor(...COLORS.green);
                        doc.text("[OK] ACTIONABLE", pageWidth - 42, y + 6);
                    } else {
                        doc.setFontSize(6);
                        doc.setFont("helvetica", "normal");
                        doc.setTextColor(...COLORS.muted);
                        doc.text("MONITOR", pageWidth - 42, y + 6);
                    }

                    // Alert message
                    doc.setFontSize(7);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(...COLORS.body);
                    doc.text(
                        alert.message.length > 100
                            ? alert.message.slice(0, 100) + "..."
                            : alert.message,
                        26, y + 11
                    );

                    y += 16;
                });

                y += 2;
            }

            // Spacing before next section
            y += 2;
        }
    }

    // ACTIVITY TIMELINE (from deep analysis)
    if (data.deepAnalysis) {
        const timeline = data.deepAnalysis.timeline;

        if (timeline.length > 0) {
            y = drawSectionHeader(doc, "Activity Timeline", y);

            // ── Summary line ──
            y = checkPageBreak(doc, y, 10);

            const criticalCount = timeline.filter(e => e.severity === "critical").length;
            const highCount = timeline.filter(e => e.severity === "high").length;
            const breachCount = timeline.filter(e => e.eventType === "breach").length;

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...COLORS.body);

            let summaryParts = [`${timeline.length} event(s) detected`];
            if (criticalCount > 0) summaryParts.push(`${criticalCount} critical`);
            if (highCount > 0) summaryParts.push(`${highCount} high priority`);
            if (breachCount > 0) summaryParts.push(`${breachCount} breach(es)`);

            doc.text(summaryParts.join("  •  "), 20, y);

            // Color-coded severity indicators inline
            if (criticalCount > 0) {
                const indicatorX = 20 + doc.getTextWidth(summaryParts.join("  •  ")) + 4;
                doc.setFillColor(...COLORS.red);
                doc.circle(indicatorX, y - 1, 1.5, "F");
            }

            y += 6;

            const displayEvents = timeline.slice(0, 25);
            // Format event type for display
            const formatEventType = (type: string): string => {
                switch (type) {
                    case "profile_discovery": return "DISCOVERY";
                    case "breach": return "BREACH";
                    case "relationship": return "RELATIONSHIP";
                    case "activity": return "ACTIVITY";
                    case "alert": return "ALERT";
                    default: return type.toUpperCase();
                }
            };

            // Format timestamp for display
            const formatTimestamp = (ts: string | Date): string => {
                try {
                    const date = typeof ts === "string" ? new Date(ts) : ts;
                    return date.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    });
                } catch {
                    return "—";
                }
            };

            autoTable(doc, {
                startY: y,
                margin: { left: 20, right: 20 },
                head: [["#", "Date", "Type", "Event", "Details", "Severity"]],
                body: displayEvents.map((event, i) => [
                    String(i + 1),
                    formatTimestamp(event.timestamp),
                    formatEventType(event.eventType),
                    event.title.length > 40
                        ? event.title.slice(0, 40) + "..."
                        : event.title,
                    event.description.length > 50
                        ? event.description.slice(0, 50) + "..."
                        : event.description,
                    event.severity.toUpperCase(),
                ]),
                theme: "grid",
                styles: {
                    fontSize: 6.5,
                    cellPadding: 2,
                    textColor: COLORS.body,
                    lineColor: COLORS.border,
                    lineWidth: 0.2,
                },
                headStyles: {
                    fillColor: COLORS.primary,
                    textColor: COLORS.white,
                    fontStyle: "bold",
                    fontSize: 6.5,
                },
                alternateRowStyles: { fillColor: COLORS.altRow },
                columnStyles: {
                    0: { cellWidth: 7, halign: "center" },
                    1: { cellWidth: 22 },
                    2: { cellWidth: 22, halign: "center" },
                    3: { cellWidth: 38 },
                    4: { cellWidth: "auto" },
                    5: { cellWidth: 18, halign: "center" },
                },
                didParseCell: (hookData: any) => {
                    // Color the severity column
                    if (hookData.section === "body" && hookData.column.index === 5) {
                        const text = hookData.cell.raw as string;
                        if (text === "CRITICAL") {
                            hookData.cell.styles.textColor = COLORS.red;
                            hookData.cell.styles.fontStyle = "bold";
                        } else if (text === "HIGH") {
                            hookData.cell.styles.textColor = [220, 120, 0];
                            hookData.cell.styles.fontStyle = "bold";
                        } else if (text === "MEDIUM") {
                            hookData.cell.styles.textColor = COLORS.yellow;
                        } else if (text === "LOW") {
                            hookData.cell.styles.textColor = COLORS.green;
                        } else {
                            hookData.cell.styles.textColor = COLORS.muted;
                        }
                    }
                    // Color the event type column
                    if (hookData.section === "body" && hookData.column.index === 2) {
                        const text = hookData.cell.raw as string;
                        if (text === "BREACH") {
                            hookData.cell.styles.textColor = COLORS.red;
                            hookData.cell.styles.fontStyle = "bold";
                        } else if (text === "ALERT") {
                            hookData.cell.styles.textColor = [220, 120, 0];
                            hookData.cell.styles.fontStyle = "bold";
                        } else if (text === "RELATIONSHIP") {
                            hookData.cell.styles.textColor = COLORS.blue;
                        } else if (text === "DISCOVERY") {
                            hookData.cell.styles.textColor = COLORS.cyan;
                        } else {
                            hookData.cell.styles.textColor = COLORS.muted;
                        }
                    }
                    // Highlight entire row background for critical events
                    if (hookData.section === "body") {
                        const rowData = hookData.row.raw as string[];
                        if (rowData && rowData[5] === "CRITICAL") {
                            hookData.cell.styles.fillColor = [255, 240, 240];
                        }
                    }
                },
            });

            y = (doc as any).lastAutoTable.finalY + 4;

            // Truncation notice
            if (timeline.length > 25) {
                y = checkPageBreak(doc, y, 6);
                doc.setFontSize(6);
                doc.setFont("helvetica", "italic");
                doc.setTextColor(...COLORS.muted);
                doc.text(
                    `Showing 25 of ${timeline.length} events. Full timeline available in the application.`,
                    20, y
                );
                y += 5;
            }

            // ── Event Type Breakdown ──
            y = checkPageBreak(doc, y, 18);

            const eventTypes = [
                {
                    type: "DISCOVERY",
                    count: timeline.filter(e => e.eventType === "profile_discovery").length,
                    color: COLORS.cyan,
                },
                {
                    type: "BREACH",
                    count: timeline.filter(e => e.eventType === "breach").length,
                    color: COLORS.red,
                },
                {
                    type: "RELATIONSHIP",
                    count: timeline.filter(e => e.eventType === "relationship").length,
                    color: COLORS.blue,
                },
                {
                    type: "ALERT",
                    count: timeline.filter(e => e.eventType === "alert").length,
                    color: [220, 120, 0] as [number, number, number],
                },
            ].filter(et => et.count > 0);

            if (eventTypes.length > 0) {
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...COLORS.heading);
                doc.text("Event Breakdown", 20, y);
                y += 5;

                const etW = contentWidth / eventTypes.length;
                eventTypes.forEach((et, i) => {
                    const x = 20 + i * etW;
                    doc.setFillColor(...COLORS.statBg);
                    doc.roundedRect(x + 1, y, etW - 2, 14, 2, 2, "F");
                    doc.setDrawColor(...COLORS.border);
                    doc.roundedRect(x + 1, y, etW - 2, 14, 2, 2, "S");

                    doc.setFontSize(11);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(...et.color);
                    doc.text(String(et.count), x + etW / 2, y + 7, { align: "center" });

                    doc.setFontSize(5.5);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(...COLORS.muted);
                    doc.text(et.type, x + etW / 2, y + 12, { align: "center" });
                });

                y += 20;
            }

            // Spacing before next section
            y += 2;
        }
    }

    // DIGITAL FOOTPRINT ANALYSIS
    const foundProfiles = data.findings.profiles.filter(p => p.found);
    if (foundProfiles.length > 0) {
        y = drawSectionHeader(doc, "Digital Footprint Analysis", y);

        doc.setFontSize(9);
        doc.setTextColor(...COLORS.body);
        doc.text(
            `Discovered ${foundProfiles.length} active profile(s) across multiple platforms. Breakdown by confidence level:`,
            20, y
        );
        y += 8;

        // Profile table
        autoTable(doc, {
            startY: y,
            margin: { left: 20, right: 20 },
            head: [["#", "Platform", "URL", "Confidence"]],
            body: foundProfiles
                .sort((a, b) => {
                    const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
                    return (order[b.confidence || "low"] || 0) - (order[a.confidence || "low"] || 0);
                })
                .map((p, i) => [
                    String(i + 1),
                    p.platform,
                    p.url.length > 50 ? p.url.slice(0, 50) + "..." : p.url,
                    confidenceLabel(p.confidence),
                ]),
            theme: "grid",
            styles: {
                fontSize: 8,
                cellPadding: 3,
                textColor: COLORS.body,
                lineColor: COLORS.border,
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: COLORS.primary,
                textColor: COLORS.white,
                fontStyle: "bold",
                fontSize: 8,
            },
            alternateRowStyles: {
                fillColor: COLORS.altRow,
            },
            columnStyles: {
                0: { cellWidth: 10, halign: "center" },
                1: { cellWidth: 30 },
                2: { cellWidth: "auto" },
                3: { cellWidth: 28, halign: "center" },
            },
            didParseCell: (hookData: any) => {
                // Color the confidence column
                if (hookData.section === "body" && hookData.column.index === 3) {
                    const text = hookData.cell.raw as string;
                    if (text === "HIGH") hookData.cell.styles.textColor = COLORS.green;
                    else if (text === "MEDIUM") hookData.cell.styles.textColor = COLORS.yellow;
                    else hookData.cell.styles.textColor = COLORS.muted;
                }
            },
        });

        y = (doc as any).lastAutoTable.finalY + 6;

        // PROFILE AVATAR GALLERY
        const profilesWithAvatars = foundProfiles.filter(p => p.avatarData);
        if (profilesWithAvatars.length > 0) {
            const COLS = 4;
            const CELL_W = contentWidth / COLS;
            const IMG_SIZE = 16;
            const CELL_H = IMG_SIZE + 14;

            y = checkPageBreak(doc, y, 10);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.primary);
            doc.text("PROFILE AVATARS", 20, y);
            y += 6;

            profilesWithAvatars.forEach((profile, idx) => {
                const col = idx % COLS;
                const row = Math.floor(idx / COLS);

                // Start a new row — check for page break
                if (col === 0 && idx > 0) {
                    y += CELL_H;
                    y = checkPageBreak(doc, y, CELL_H);
                } else if (col === 0) {
                    y = checkPageBreak(doc, y, CELL_H);
                }

                const cellX = 20 + col * CELL_W;
                const imgX = cellX + (CELL_W - IMG_SIZE) / 2;
                const imgY = y;

                // Avatar image
                try {
                    const imgData = profile.avatarData!;
                    const format = imgData.startsWith("data:image/png") ? "PNG" : "JPEG";
                    doc.addImage(imgData, format, imgX, imgY, IMG_SIZE, IMG_SIZE, undefined, "FAST");
                } catch {
                    // Fallback placeholder box
                    doc.setFillColor(...COLORS.statBg);
                    doc.rect(imgX, imgY, IMG_SIZE, IMG_SIZE, "F");
                    doc.setDrawColor(...COLORS.border);
                    doc.rect(imgX, imgY, IMG_SIZE, IMG_SIZE, "S");
                }

                // Platform name
                doc.setFontSize(7);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...COLORS.heading);
                doc.text(profile.platform, cellX + CELL_W / 2, imgY + IMG_SIZE + 4, { align: "center" });

                // Confidence badge
                const confColor = profile.confidence === "high"
                    ? COLORS.green
                    : profile.confidence === "medium"
                        ? COLORS.yellow
                        : COLORS.muted;
                doc.setFontSize(6);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(...confColor);
                doc.text(confidenceLabel(profile.confidence), cellX + CELL_W / 2, imgY + IMG_SIZE + 9, { align: "center" });
            });

            // Advance y past the last row
            const totalRows = Math.ceil(profilesWithAvatars.length / COLS);
            y += totalRows * CELL_H + 4;
        }
    }

    // EMAIL INTELLIGENCE
    if (data.findings.emails && data.findings.emails.length > 0) {
        y = drawSectionHeader(doc, "Email Intelligence", y);

        const emailRows = data.findings.emails.map((e, i) => {
            const addr = typeof e === "string" ? e : e.address;
            return [String(i + 1), addr];
        });

        autoTable(doc, {
            startY: y,
            margin: { left: 20, right: 20 },
            head: [["#", "Email Address"]],
            body: emailRows,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.body, lineColor: COLORS.border, lineWidth: 0.2 },
            headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
            alternateRowStyles: { fillColor: COLORS.altRow },
            columnStyles: { 0: { cellWidth: 10, halign: "center" } },
        });
        y = (doc as any).lastAutoTable.finalY + 4;

        // Breach info from metadata
        const emailIntel = data.findings.metadata?.emailIntel;
        if (emailIntel) {
            y = checkPageBreak(doc, y, 20);
            doc.setFontSize(8);
            if (emailIntel.breaches !== undefined) {
                const breachColor = emailIntel.breaches > 0 ? COLORS.red : COLORS.green;
                doc.setTextColor(...breachColor);
                doc.setFont("helvetica", "bold");
                doc.text(`Data Breaches: ${emailIntel.breaches}`, 20, y);
                doc.setFont("helvetica", "normal");
                y += 5;
            }
            if (emailIntel.valid !== undefined) {
                doc.setTextColor(...COLORS.body);
                doc.text(`Valid: ${emailIntel.valid ? "Yes" : "No"}`, 20, y);
                y += 5;
            }
            if (emailIntel.disposable !== undefined) {
                doc.text(`Disposable: ${emailIntel.disposable ? "Yes" : "No"}`, 20, y);
                y += 5;
            }
            y += 2;
        }
    }

    // DOMAIN INTELLIGENCE
    if (data.findings.domains && data.findings.domains.length > 0) {
        y = drawSectionHeader(doc, "Domain Intelligence", y);

        const domainRows = data.findings.domains.map((d, i) => {
            const domain = typeof d === "string" ? d : d.domain;
            return [String(i + 1), domain];
        });

        autoTable(doc, {
            startY: y,
            margin: { left: 20, right: 20 },
            head: [["#", "Domain"]],
            body: domainRows,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.body, lineColor: COLORS.border, lineWidth: 0.2 },
            headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
            alternateRowStyles: { fillColor: COLORS.altRow },
            columnStyles: { 0: { cellWidth: 10, halign: "center" } },
        });
        y = (doc as any).lastAutoTable.finalY + 4;

        // Domain metadata
        const domainIntel = data.findings.metadata?.domainIntel;
        if (domainIntel) {
            y = checkPageBreak(doc, y, 20);
            doc.setFontSize(8);
            doc.setTextColor(...COLORS.body);
            if (domainIntel.shodanPorts !== undefined) {
                doc.text(`Open Ports (Shodan): ${domainIntel.shodanPorts}`, 20, y);
                y += 5;
            }
            if (domainIntel.shodanVulns !== undefined) {
                const vulnColor = domainIntel.shodanVulns > 0 ? COLORS.red : COLORS.green;
                doc.setTextColor(...vulnColor);
                doc.setFont("helvetica", "bold");
                doc.text(`Known Vulnerabilities: ${domainIntel.shodanVulns}`, 20, y);
                doc.setFont("helvetica", "normal");
                y += 5;
            }
            if (domainIntel.ssl !== undefined) {
                doc.setTextColor(...COLORS.body);
                doc.text(`SSL Valid: ${domainIntel.ssl ? "Yes" : "No"}`, 20, y);
                y += 5;
            }
            y += 2;
        }
    }

    // PHONE INTELLIGENCE
    if (data.findings.phones && data.findings.phones.length > 0) {
        y = drawSectionHeader(doc, "Phone Intelligence", y);

        const phoneRows = data.findings.phones.map((p, i) => [String(i + 1), p.number]);

        autoTable(doc, {
            startY: y,
            margin: { left: 20, right: 20 },
            head: [["#", "Phone Number"]],
            body: phoneRows,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.body, lineColor: COLORS.border, lineWidth: 0.2 },
            headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
            alternateRowStyles: { fillColor: COLORS.altRow },
            columnStyles: { 0: { cellWidth: 10, halign: "center" } },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
    }


    // KEY INSIGHTS
    // ==========================
    // ACTIONABLE INTELLIGENCE
    // ==========================
    if (data.deepAnalysis && data.deepAnalysis.insights.length > 0) {
        // ── Rich structured insights from deep analysis ──
        const insights = data.deepAnalysis.insights;

        y = drawSectionHeader(doc, "Actionable Intelligence", y);

        // Summary line with priority breakdown
        y = checkPageBreak(doc, y, 10);

        const criticalInsights = insights.filter(i => i.priority === "critical").length;
        const highInsights = insights.filter(i => i.priority === "high").length;
        const mediumInsights = insights.filter(i => i.priority === "medium").length;
        const lowInsights = insights.filter(i => i.priority === "low").length;

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.body);

        let insightSummaryParts = [`${insights.length} intelligence item(s)`];
        if (criticalInsights > 0) insightSummaryParts.push(`${criticalInsights} critical`);
        if (highInsights > 0) insightSummaryParts.push(`${highInsights} high`);
        if (mediumInsights > 0) insightSummaryParts.push(`${mediumInsights} medium`);
        if (lowInsights > 0) insightSummaryParts.push(`${lowInsights} low`);

        doc.text(insightSummaryParts.join("  •  "), 20, y);
        y += 6;

        // ── Render each insight as a structured card ──
        insights.forEach((insight, index) => {
            // Each card needs ~40-60mm depending on content
            y = checkPageBreak(doc, y, 45);

            const cardStartY = y;
            const priorityColor = severityColor(insight.priority);
            const catColor = categoryColor(insight.category);

            // Card background
            doc.setFillColor(...COLORS.statBg);
            doc.roundedRect(20, y, contentWidth, 6, 2, 2, "F");

            // Priority accent bar on the left
            doc.setFillColor(...priorityColor);
            doc.rect(20, y, 3, 6, "F");

            // Priority badge
            doc.setFillColor(...priorityColor);
            doc.roundedRect(26, y + 1, 18, 4.5, 1, 1, "F");
            doc.setFontSize(5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.white);
            doc.text(insight.priority.toUpperCase(), 28, y + 4);

            // Category badge
            doc.setFillColor(...catColor);
            doc.roundedRect(47, y + 1, 20, 4.5, 1, 1, "F");
            doc.setFontSize(5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.white);
            doc.text(insight.category.toUpperCase(), 49, y + 4);

            // Insight number
            doc.setFontSize(6);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...COLORS.muted);
            doc.text(`#${index + 1}`, pageWidth - 26, y + 4);

            y += 9;

            // ── Insight text (the main finding) ──
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.heading);
            const insightLines = doc.splitTextToSize(insight.insight, contentWidth - 8);
            doc.text(insightLines, 24, y);
            y += insightLines.length * 3.8 + 2;

            // ── Evidence ──
            if (insight.evidence.length > 0) {
                doc.setFontSize(6);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...COLORS.muted);
                doc.text("EVIDENCE", 24, y);
                y += 3.5;

                doc.setFont("helvetica", "normal");
                doc.setFontSize(7);
                doc.setTextColor(...COLORS.body);
                insight.evidence.forEach((ev) => {
                    y = checkPageBreak(doc, y, 5);
                    doc.setTextColor(...COLORS.muted);
                    doc.text("•", 26, y);
                    doc.setTextColor(...COLORS.body);
                    const evLines = doc.splitTextToSize(ev, contentWidth - 14);
                    doc.text(evLines, 30, y);
                    y += evLines.length * 3.2 + 1;
                });
                y += 1;
            }

            // ── Recommendation ──
            y = checkPageBreak(doc, y, 8);
            doc.setFontSize(6);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.muted);
            doc.text("RECOMMENDATION", 24, y);
            y += 3.5;

            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.blue);
            doc.text("->", 26, y);
            doc.setFont("helvetica", "normal");
            const recLines = doc.splitTextToSize(insight.recommendation, contentWidth - 14);
            doc.text(recLines, 30, y);
            y += recLines.length * 3.2 + 2;

            // ── Impact ──
            y = checkPageBreak(doc, y, 8);
            doc.setFontSize(6);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.muted);
            doc.text("IMPACT", 24, y);
            y += 3.5;

            doc.setFontSize(7);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(...COLORS.body);
            const impactLines = doc.splitTextToSize(insight.impact, contentWidth - 14);
            doc.text(impactLines, 26, y);
            y += impactLines.length * 3.2 + 2;

            // Card bottom separator
            doc.setDrawColor(...COLORS.border);
            doc.setLineWidth(0.2);
            doc.line(24, y, pageWidth - 24, y);
            y += 5;
        });

        y += 2;

    } else if (data.analysis && data.analysis.insights.length > 0) {
        // ── Fallback: plain text insights from basic analysis ──
        y = drawSectionHeader(doc, "Key Insights", y);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        data.analysis.insights.forEach((insight) => {
            y = checkPageBreak(doc, y, 8);
            doc.setTextColor(...COLORS.cyan);
            doc.setFont("helvetica", "bold");
            doc.text(">", 22, y);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...COLORS.body);
            const lines = doc.splitTextToSize(insight, contentWidth - 10);
            doc.text(lines, 28, y);
            y += lines.length * 4 + 2;
        });
        y += 2;
    }

    // RELATIONSHIP SUMMARY
    if (data.relationships && data.relationships.length > 0) {
        y = drawSectionHeader(doc, "Discovered Relationships", y);

        autoTable(doc, {
            startY: y,
            margin: { left: 20, right: 20 },
            head: [["#", "Related Entity", "Relationship", "Strength"]],
            body: data.relationships.slice(0, 20).map((r: any, i: number) => [
                String(i + 1),
                r.targetName || r.target || "Unknown",
                r.type || r.relationType || "associated",
                r.strength !== undefined ? `${r.strength}%` : "-",
            ]),
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.body, lineColor: COLORS.border, lineWidth: 0.2 },
            headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
            alternateRowStyles: { fillColor: COLORS.altRow },
            columnStyles: { 0: { cellWidth: 10, halign: "center" }, 3: { cellWidth: 22, halign: "center" } },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
    }

    // CONTENT ANALYSIS
    if (data.contentAnalysis && data.contentAnalysis.activityPatterns.totalPostsAnalyzed > 0) {
        const ca = data.contentAnalysis;
        y = drawSectionHeader(doc, "Content Analysis", y);

        // Summary row
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.body);
        const summaryText = `Analyzed ${ca.activityPatterns.totalPostsAnalyzed} posts across ${ca.activityPatterns.contentTypes.join(", ")} content. Overall sentiment: ${ca.sentiment.toUpperCase()}. Most active platform: ${ca.activityPatterns.mostActivePlatform}.`;
        const summaryLines = doc.splitTextToSize(summaryText, contentWidth);
        y = checkPageBreak(doc, y, summaryLines.length * 4 + 4);
        doc.text(summaryLines, 20, y);
        y += summaryLines.length * 4 + 4;

        // Topics & Interests table
        const contentRows: string[][] = [];
        if (ca.interests.length > 0) {
            contentRows.push(["Interests", ca.interests.slice(0, 10).join(", ")]);
        }
        if (ca.languagesUsed.length > 0) {
            contentRows.push(["Programming Languages", ca.languagesUsed.join(", ")]);
        }
        if (ca.topTopics.length > 0) {
            contentRows.push(["Top Topics", ca.topTopics.slice(0, 8).map((t: any) => `${t.topic} (${t.frequency})`).join(", ")]);
        }
        if (ca.redFlags.length > 0) {
            contentRows.push(["Red Flags", ca.redFlags.map((f: any) => `${f.flag} [${f.severity}]`).join("; ")]);
        }
        contentRows.push(["Content Types", ca.activityPatterns.contentTypes.join(", ")]);
        contentRows.push(["Sentiment", ca.sentiment.toUpperCase()]);

        if (contentRows.length > 0) {
            autoTable(doc, {
                startY: y,
                margin: { left: 20, right: 20 },
                head: [["Metric", "Details"]],
                body: contentRows,
                theme: "grid",
                styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.body, lineColor: COLORS.border, lineWidth: 0.2 },
                headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
                alternateRowStyles: { fillColor: COLORS.altRow },
                columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" } },
                didParseCell: (hookData: any) => {
                    if (hookData.section === "body") {
                        const prop = hookData.row.raw?.[0] as string;
                        if (prop === "Red Flags" && hookData.column.index === 1) {
                            hookData.cell.styles.textColor = COLORS.red;
                        }
                        if (prop === "Sentiment" && hookData.column.index === 1) {
                            const val = hookData.row.raw?.[1] as string;
                            if (val === "NEGATIVE") hookData.cell.styles.textColor = COLORS.red;
                            else if (val === "POSITIVE") hookData.cell.styles.textColor = COLORS.green;
                            else if (val === "MIXED") hookData.cell.styles.textColor = COLORS.yellow;
                        }
                    }
                },
            });
            y = (doc as any).lastAutoTable.finalY + 6;
        }
    }

    // INVESTIGATION METADATA
    // ==========================
    // INVESTIGATION METADATA
    // ==========================
    y = drawSectionHeader(doc, "Investigation Metadata", y);

    const metaItems: string[][] = [
        ["Investigation ID", data.investigationId],
        ["Target", data.entity.name],
        ["Target Type", data.entity.type],
        ["Status", data.status.toUpperCase()],
        ["Duration", `${data.duration} seconds`],
        ["Generated At", formatDate(data.createdAt)],
        ["Profiles Scanned", String(data.findings.metadata?.searchedPlatforms || "20+")],
        ["Profiles Found", String(data.findings.profiles.length)],
        ["High Confidence", String(data.findings.metadata?.highConfidenceProfiles || data.findings.profiles.filter(p => p.confidence === "high").length)],
    ];

    // Deep analysis metadata
    if (data.deepAnalysis) {
        const da = data.deepAnalysis;
        const df = da.digitalFootprint;
        const bp = da.behaviorProfile;

        metaItems.push(
            ["─── Deep Analysis ───", ""],
            ["Analysis Confidence", `${da.confidence}%`],
            ["Analysis Date", formatDate(
                typeof da.analysisDate === "string"
                    ? da.analysisDate
                    : da.analysisDate.toString()
            )],
            ["Activity Level", bp.activityLevel.replace("_", " ").toUpperCase()],
            ["Footprint Size", bp.digitalFootprint.size.toUpperCase()],
            ["Exposure Level", df.overview.exposureLevel.toUpperCase()],
            ["Visibility Score", `${df.overview.visibilityScore}/100`],
            ["Security Posture", bp.securityPosture.level.toUpperCase()],
            ["Watchdog Alerts", String(df.watchdogAlerts.length)],
            ["Behavioral Flags", String(bp.behavioralFlags.length)],
            ["Risk Areas", String(df.riskAreas.length)],
            ["Timeline Events", String(da.timeline.length)],
            ["Actionable Insights", String(da.insights.length)],
        );
    }

    autoTable(doc, {
        startY: y,
        margin: { left: 20, right: 20 },
        head: [["Property", "Value"]],
        body: metaItems,
        theme: "grid",
        styles: {
            fontSize: 8,
            cellPadding: 3,
            textColor: COLORS.body,
            lineColor: COLORS.border,
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: COLORS.primary,
            textColor: COLORS.white,
            fontStyle: "bold",
            fontSize: 8,
        },
        alternateRowStyles: { fillColor: COLORS.altRow },
        columnStyles: {
            0: { cellWidth: 45, fontStyle: "bold" },
        },
        didParseCell: (hookData: any) => {
            if (hookData.section === "body") {
                const prop = hookData.row.raw?.[0] as string;
                const val = hookData.row.raw?.[1] as string;

                // Style the separator row
                if (prop && prop.startsWith("───")) {
                    hookData.cell.styles.fillColor = COLORS.sectionBg;
                    hookData.cell.styles.textColor = COLORS.primary;
                    hookData.cell.styles.fontStyle = "bold";
                    hookData.cell.styles.fontSize = 7;
                }

                // Color-code specific values
                if (hookData.column.index === 1) {
                    if (prop === "Exposure Level") {
                        if (val === "CRITICAL" || val === "HIGH") {
                            hookData.cell.styles.textColor = COLORS.red;
                            hookData.cell.styles.fontStyle = "bold";
                        } else if (val === "MODERATE") {
                            hookData.cell.styles.textColor = COLORS.yellow;
                        } else {
                            hookData.cell.styles.textColor = COLORS.green;
                        }
                    }
                    if (prop === "Security Posture") {
                        if (val === "POOR" || val === "WEAK") {
                            hookData.cell.styles.textColor = COLORS.red;
                            hookData.cell.styles.fontStyle = "bold";
                        } else if (val === "MODERATE") {
                            hookData.cell.styles.textColor = COLORS.yellow;
                        } else {
                            hookData.cell.styles.textColor = COLORS.green;
                        }
                    }
                    if (prop === "Watchdog Alerts" || prop === "Behavioral Flags" || prop === "Risk Areas") {
                        const num = parseInt(val, 10);
                        if (num > 0) {
                            hookData.cell.styles.textColor = COLORS.red;
                            hookData.cell.styles.fontStyle = "bold";
                        }
                    }
                }
            }
        },
    });

    // DISCLAIMER
    // ==========================
    // DISCLAIMER
    // ==========================
    y = (doc as any).lastAutoTable.finalY + 10;
    y = checkPageBreak(doc, y, 20);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "italic");

    let disclaimer = "DISCLAIMER: This report was generated automatically by SEPTO using open-source intelligence (OSINT) techniques. All information was gathered from publicly available sources. This report is intended for authorized security research purposes only. The accuracy of findings depends on the availability and reliability of public data sources.";

    if (data.deepAnalysis) {
        disclaimer += " The deep analysis sections, including behavioral profiling, digital exposure metrics, risk assessments, and actionable intelligence, rely on algorithmic analysis and pattern recognition. These findings should be validated by human analysts before informing operational decisions.";
    }

    const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);
    doc.text(disclaimerLines, 20, y);

    // PAGE FOOTERS
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addPageFooter(doc, i, totalPages);
    }

    const reportType = data.deepAnalysis ? "Digital_Footprint" : "Report";
    const filename = `SEPTO_${reportType}_${data.entity.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
}
