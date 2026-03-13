import { OllamaClient } from "@/lib/ai/ollama-adapter";
import { Intent, OsintFindings } from "../types";
import type { ContentAnalysis } from "../tools/analysis-tools";

/**
 * Generate a comprehensive executive summary via LLM.
 * This is the one place where an LLM call genuinely adds value —
 * turning structured data into readable prose.
 */
export async function generateSummary(
    llm: OllamaClient,
    findings: OsintFindings,
    intent: Intent,
    riskScore: number,
    contentAnalysis?: ContentAnalysis,
): Promise<string> {
    // Build platform breakdown
    const platformCounts: Record<string, number> = {};
    const highConfPlatforms: string[] = [];
    const medConfPlatforms: string[] = [];
    for (const p of findings.profiles) {
        if (p.found) {
            platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
            if (p.confidence === "high") highConfPlatforms.push(p.platform);
            else if (p.confidence === "medium") medConfPlatforms.push(p.platform);
        }
    }
    const platformList = Object.entries(platformCounts)
        .map(([name, count]) => count > 1 ? `${name} (${count})` : name)
        .join(", ");

    const riskLabel = riskScore >= 7 ? "HIGH" : riskScore >= 4 ? "MODERATE" : "LOW";

    const prompt = `You are a senior threat intelligence analyst writing a professional investigation for digital footprint assessment.

Write a detailed executive summary for the following OSINT investigation. Write in natural flowing paragraphs — DO NOT use JSON, bullet points, or any structured format. Write as prose only.

=== INVESTIGATION DATA ===
Subject: ${intent.target}
Subject Type: ${intent.targetType}
Total Profiles Discovered: ${findings.profiles.filter(p => p.found).length}
High-Confidence Profiles: ${highConfPlatforms.length} (${highConfPlatforms.join(", ") || "none"})
Medium-Confidence Profiles: ${medConfPlatforms.length} (${medConfPlatforms.join(", ") || "none"})
Platforms: ${platformList || "none"}
Emails Discovered: ${findings.emails.length}
Domains Discovered: ${findings.domains.length}
Risk Score: ${riskScore}/10 (${riskLabel})
${findings.metadata.emailIntel ? `Email Intelligence: ${findings.metadata.emailIntel.breaches || 0} data breaches found, valid=${findings.metadata.emailIntel.valid}, disposable=${findings.metadata.emailIntel.disposable}` : ""}
${findings.metadata.domainIntel ? `Domain Intelligence: ${findings.metadata.domainIntel.shodanPorts || 0} open ports, ${findings.metadata.domainIntel.shodanVulns || 0} known vulnerabilities, SSL valid=${findings.metadata.domainIntel.ssl}` : ""}
${findings.metadata.phoneIntel ? `Phone Intelligence: Country=${findings.metadata.phoneIntel.country}, Valid=${findings.metadata.phoneIntel.valid}` : ""}
${contentAnalysis ? `
--- CONTENT ANALYSIS (from scraped posts) ---
Overall Sentiment: ${contentAnalysis.sentiment}
Posts Analyzed: ${contentAnalysis.activityPatterns.totalPostsAnalyzed}
Most Active Platform: ${contentAnalysis.activityPatterns.mostActivePlatform}
Content Types: ${contentAnalysis.activityPatterns.contentTypes.join(", ")}
Top Interests/Topics: ${contentAnalysis.interests.slice(0, 10).join(", ") || "none identified"}
${contentAnalysis.languagesUsed.length > 0 ? `Programming Languages: ${contentAnalysis.languagesUsed.join(", ")}` : ""}
${contentAnalysis.redFlags.length > 0 ? `Red Flags: ${contentAnalysis.redFlags.map((f) => `${f.flag} (${f.severity})`).join(", ")}` : "No red flags detected"}
--- END CONTENT ANALYSIS ---` : ""}
=== END DATA ===

Your summary MUST cover these areas in 3-5 paragraphs:

1. OVERVIEW: Who is the subject, what type of investigation was conducted, and what is the overall scope of their digital footprint.

2. FOCUS: Describe the PERSON's digital footprint - their professional presence, social media activity, and public affiliations.

3. DIGITAL PRESENCE ANALYSIS: Describe which platforms they were found on, emphasize the high-confidence findings, note the breadth of their online presence, and highlight any notable patterns (e.g., heavy social media usage, professional vs personal accounts).
${contentAnalysis ? `
4. CONTENT & ACTIVITY ANALYSIS: Based on the CONTENT ANALYSIS data, describe what the subject posts about, their key interests and topics, the overall sentiment of their content, and any notable patterns in their online activity. If programming languages were detected, mention their technical focus areas.` : ""}

${contentAnalysis ? "5" : "4"}. RISK ASSESSMENT: Explain the ${riskLabel} risk score of ${riskScore}/10, what contributes to it (number of exposed profiles, data breaches, vulnerabilities${contentAnalysis?.redFlags.length ? ", content red flags" : ""}), and what this means for the subject's security posture.

${contentAnalysis ? "6" : "5"}. KEY FINDINGS: Highlight the most significant discoveries — any data breaches, exposed infrastructure, cross-platform identity links, or notable absences.

IMPORTANT: Write ONLY plain text paragraphs. Do NOT wrap your response in JSON, code blocks, or any structured format. Do NOT start with a heading or label. Begin directly with the first paragraph. Do NOT hallucinate or infer beyond what is shown in the INVESTIGATION DATA.`;

    const response = await llm.chat.completions.create({
        messages: [
            {
                role: "system",
                content:
                    "You are a senior investigative intelligence analyst. You write detailed, professional reports in plain English prose. You NEVER output JSON, bullet points, or structured data — only natural flowing paragraphs.",
            },
            { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 830,
    });

    let summary = response.choices[0].message.content || "No summary available.";

    // Strip any JSON wrapping the LLM might add despite instructions
    summary = summary.trim();
    summary = summary.replace(/^```[\s\S]*?```$/gm, "").trim();

    // If the response looks like JSON, try to extract usable text
    if (summary.startsWith("{") || summary.startsWith("[")) {
        try {
            const parsed = JSON.parse(summary);

            const collectStrings = (obj: any): string[] => {
                const strings: string[] = [];
                if (typeof obj === "string" && obj.trim().length > 10) {
                    strings.push(obj.trim());
                } else if (typeof obj === "object" && obj !== null) {
                    for (const val of Object.values(obj)) {
                        strings.push(...collectStrings(val));
                    }
                }
                return strings;
            };

            const extracted = collectStrings(parsed);
            if (extracted.length > 0) {
                const longest = extracted.reduce((a, b) => a.length >= b.length ? a : b, "");
                summary = longest.length > 100 ? longest : extracted.join("\n\n");
            } else {
                summary = buildFallbackSummary(findings, intent, riskScore, contentAnalysis);
            }
        } catch {
            // Not valid JSON, use as-is
        }
    }

    summary = summary.replace(/^["']|["']$/g, "").trim();

    // Final safety net
    if (summary.length < 30 || /^\s*\{/.test(summary)) {
        summary = buildFallbackSummary(findings, intent, riskScore, contentAnalysis);
    }

    return summary;
}

/**
 * Build a data-driven executive summary when the LLM fails to produce one.
 */
function buildFallbackSummary(
    findings: OsintFindings,
    intent: Intent,
    riskScore: number,
    contentAnalysis?: ContentAnalysis,
): string {
    const foundProfiles = findings.profiles.filter((p) => p.found);
    const highConf = foundProfiles.filter((p) => p.confidence === "high");
    const platforms = [...new Set(foundProfiles.map((p) => p.platform))];
    const riskLabel = riskScore >= 7 ? "HIGH" : riskScore >= 4 ? "MODERATE" : "LOW";

    const parts: string[] = [];

    parts.push(
        `An OSINT investigation was conducted on ${intent.targetType} "${intent.target}". ` +
        `The investigation identified ${foundProfiles.length} social media profile${foundProfiles.length !== 1 ? "s" : ""} ` +
        `across ${platforms.length} platform${platforms.length !== 1 ? "s" : ""}` +
        (platforms.length > 0 ? `, including ${platforms.slice(0, 5).join(", ")}` : "") + "."
    );

    if (highConf.length > 0) {
        parts.push(
            `${highConf.length} profile${highConf.length !== 1 ? "s were" : " was"} confirmed with high confidence. ` +
            `The subject maintains a digital presence that spans ${platforms.length > 5 ? "numerous" : platforms.length > 2 ? "several" : "a limited number of"} online platforms.`
        );
    }

    // Content analysis paragraph
    if (contentAnalysis && contentAnalysis.activityPatterns.totalPostsAnalyzed > 0) {
        const ca = contentAnalysis;
        let contentPara = `Content analysis of ${ca.activityPatterns.totalPostsAnalyzed} posts across ${ca.activityPatterns.contentTypes.join(", ")} content types reveals ${ca.sentiment} overall sentiment. `;
        if (ca.interests.length > 0) {
            contentPara += `Key interests include ${ca.interests.slice(0, 5).join(", ")}. `;
        }
        if (ca.languagesUsed.length > 0) {
            contentPara += `Technical activity involves ${ca.languagesUsed.join(", ")}. `;
        }
        contentPara += `The most active platform is ${ca.activityPatterns.mostActivePlatform}.`;
        if (ca.redFlags.length > 0) {
            contentPara += ` ${ca.redFlags.length} content red flag${ca.redFlags.length !== 1 ? "s were" : " was"} identified: ${ca.redFlags.map((f) => f.flag).join(", ")}.`;
        }
        parts.push(contentPara);
    }

    parts.push(
        `The overall risk score is ${riskScore}/10 (${riskLabel}). ` +
        (findings.emails.length > 0 ? `${findings.emails.length} associated email address${findings.emails.length !== 1 ? "es were" : " was"} discovered. ` : "") +
        (findings.domains.length > 0 ? `${findings.domains.length} linked domain${findings.domains.length !== 1 ? "s were" : " was"} identified. ` : "") +
        `Further analysis may be warranted based on the scope of the subject's digital exposure.`
    );

    return parts.join("\n\n");
}
