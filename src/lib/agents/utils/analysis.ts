import { OllamaClient } from "@/lib/ai/ollama-adapter";
import { Intent, OsintFindings } from "../types";
import {
    calculateRiskScore,
    generateInsights,
} from "../tools/osint-tools";
import { generateSummary } from "./llm-helpers";

/**
 * Run the full analysis pipeline: risk score → summary → insights.
 */
export async function analyzeResults(
    llm: OllamaClient,
    findings: OsintFindings,
    intent: Intent
) {
    const riskScore = calculateRiskScore(findings);
    const summary = await generateSummary(llm, findings, intent, riskScore);
    const insights = generateInsights(findings, riskScore);

    return { riskScore, summary, insights };
}

/**
 * Generate actionable recommendations based on findings and risk score.
 * Pure function — no LLM call needed.
 */
export function generateRecommendations(
    findings: OsintFindings,
    riskScore: number
): string[] {
    const recommendations: string[] = [];

    // Risk-based recommendations
    if (riskScore >= 7) {
        recommendations.push(
            "🔴 HIGH PRIORITY: Review and limit information exposure immediately"
        );
        recommendations.push("🔒 Enable 2FA on all identified accounts");
        recommendations.push(
            "🔍 Conduct full security audit of online presence"
        );
    } else if (riskScore >= 4) {
        recommendations.push(
            "🟡 MEDIUM PRIORITY: Review privacy settings on active platforms"
        );
        recommendations.push("👁️ Monitor for unusual activity");
        recommendations.push("🔑 Update passwords on identified accounts");
    } else {
        recommendations.push("🟢 LOW RISK: Maintain current security posture");
        recommendations.push("📅 Schedule periodic monitoring");
    }

    // Email-specific recommendations
    if (findings.metadata.emailIntel?.breaches > 0) {
        recommendations.push(
            `🚨 URGENT: ${findings.metadata.emailIntel.breaches} data breach(es) detected - change passwords immediately`
        );
    }

    // Domain-specific recommendations
    if (findings.metadata.domainIntel?.shodanVulns > 0) {
        recommendations.push(
            `⚠️ Domain has ${findings.metadata.domainIntel.shodanVulns} known vulnerabilities - patch immediately`
        );
    }

    if (findings.profiles.length > 10) {
        recommendations.push(
            "📱 Consider consolidating online presence to reduce attack surface"
        );
    }

    if (findings.emails.length > 0) {
        recommendations.push(
            `📧 Check exposed emails against Have I Been Pwned`
        );
    }

    recommendations.push("📊 Generate full PDF report for documentation");
    return recommendations;
}
