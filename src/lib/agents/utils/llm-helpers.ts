import { OllamaClient } from "@/lib/ai/ollama-adapter";
import {
    Intent,
    IntentSchema,
    InvestigationPlan,
    InvestigationPlanSchema,
    OsintFindings,
    ExecutionContext,
    StepResult,
    ReflectionResult,
} from "../types";

function getFallbackPlanDuration(
    scope: Intent["scope"],
    stepCount: number
): string {
    if (stepCount > 0) {
        return `${Math.max(1, stepCount)} minute${stepCount === 1 ? "" : "s"}`;
    }

    const defaults: Record<Intent["scope"], string> = {
        quick: "3 minutes",
        standard: "6 minutes",
        deep: "10 minutes",
    };

    return defaults[scope];
}

function normalizePlanOutput(
    rawPlan: unknown,
    intent: Intent
): unknown {
    if (!rawPlan || typeof rawPlan !== "object") {
        return rawPlan;
    }

    const plan = rawPlan as {
        steps?: unknown;
        estimatedDuration?: unknown;
    };

    const hasEstimatedDuration =
        typeof plan.estimatedDuration === "string" &&
        plan.estimatedDuration.trim().length > 0;

    if (hasEstimatedDuration) {
        return rawPlan;
    }

    const stepCount = Array.isArray(plan.steps) ? plan.steps.length : 0;
    return {
        ...plan,
        estimatedDuration: getFallbackPlanDuration(intent.scope, stepCount),
    };
}

/**
 * Parse a natural-language investigation request into a structured Intent.
 */
export async function parseIntent(
    llm: OllamaClient,
    userInput: string
): Promise<Intent> {
    const prompt = `Parse this OSINT investigation request and extract the target entity.

User request: "${userInput}"

Rules:
- target: The entity to investigate (name, username, email, domain, or IP)
- targetType: one of "username", "email", "domain", "ip", "person", "organization"
- intent: one of "investigate", "monitor", "analyze", "search" (default: "investigate")
- scope: one of "quick", "standard", "deep" (default: "standard")

Examples:
"Investigate Elon Musk" → {"target":"Elon Musk","targetType":"person","intent":"investigate","scope":"standard"}
"Search @johndoe" → {"target":"johndoe","targetType":"username","intent":"search","scope":"standard"}
"Deep scan example.com" → {"target":"example.com","targetType":"domain","intent":"investigate","scope":"deep"}
"Analyze user@mail.com" → {"target":"user@mail.com","targetType":"email","intent":"analyze","scope":"standard"}

Respond with ONLY a JSON object, no other text:`;

    const response = await llm.chat.completions.create({
        messages: [
            {
                role: "system",
                content:
                    "You output only valid JSON. No markdown, no explanation, no code fences.",
            },
            { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 200,
    });

    const content = response.choices[0].message.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;
    const parsed = JSON.parse(jsonString);

    // Strip any suggestedUsername from metadata — name-first search handles discovery
    if (parsed.metadata?.suggestedUsername) {
        delete parsed.metadata.suggestedUsername;
    }

    return IntentSchema.parse(parsed);
}

/**
 * Ask the LLM to produce a step-by-step investigation plan.
 */
export async function createPlan(
    llm: OllamaClient,
    intent: Intent
): Promise<InvestigationPlan> {
    const prompt = `Create a step-by-step investigation plan.

Target: ${intent.target}
Type: ${intent.targetType}
Intent: ${intent.intent}
Scope: ${intent.scope}

Available tools (use ONLY these exact IDs):
- osint-gather: Collect OSINT data (profiles, emails, domains). ALWAYS include this first.
- analyze-risk: Score risk and generate summary. Requires osint-gather.
- generate-recommendations: Produce actionable recommendations. Requires analyze-risk.
- store-findings: Persist results to database. Requires osint-gather.
- discover-relationships: Map entity relationships and network. Requires store-findings.
- deep-analysis: Behavioral profiling and digital footprint analysis. Requires osint-gather.

Rules:
- "step" is the 1-based sequence number
- "dependsOn" references the step number this step needs completed first (omit if none)
- Include "estimatedDuration" as a short string (example: "5 minutes")
- For "quick" scope: use osint-gather + analyze-risk + generate-recommendations only
- For "standard" scope: use all except deep-analysis
- For "deep" scope: use all tools

Example:
{"steps":[{"step":1,"action":"Gather OSINT data","tool":"osint-gather","priority":1},{"step":2,"action":"Analyze risk","tool":"analyze-risk","priority":1,"dependsOn":1},{"step":3,"action":"Generate recommendations","tool":"generate-recommendations","priority":2,"dependsOn":2},{"step":4,"action":"Store findings","tool":"store-findings","priority":2,"dependsOn":1},{"step":5,"action":"Discover relationships","tool":"discover-relationships","priority":3,"dependsOn":4},{"step":6,"action":"Deep behavioral analysis","tool":"deep-analysis","priority":3,"dependsOn":1}],"estimatedDuration":"5 minutes"}

Respond with ONLY a JSON object:`;

    const response = await llm.chat.completions.create({
        messages: [
            {
                role: "system",
                content:
                    "You output only valid JSON. No markdown, no explanation, no code fences.",
            },
            { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
    });

    const content = response.choices[0].message.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;
    const parsed = JSON.parse(jsonString);
    const normalized = normalizePlanOutput(parsed, intent);
    return InvestigationPlanSchema.parse(normalized);
}

/**
 * Evaluate the most recent step result to determine if the plan needs modification.
 */
export async function evaluateStepResults(
    llm: OllamaClient,
    intent: Intent,
    findings: OsintFindings,
    recentResult: StepResult,
    stepName: string
): Promise<ReflectionResult> {
    const prompt = `Evaluate the intermediate result of an OSINT investigation step.

Target: ${intent.target}
Type: ${intent.targetType}
Intent: ${intent.intent}

Step Executed: ${stepName}
Step Status: ${recentResult.status}
Step Summary: ${recentResult.summary}
Step Error: ${recentResult.error || "None"}

Current Findings Summary:
- Profiles: ${findings.profiles.length}
- Emails: ${findings.emails.length}
- Domains: ${findings.domains.length}

Does the recent step's failure or outcome critically compromise the investigation such that a replan is needed, or is the confidence so low that we must change approach?
Respond with JSON only:
{
  "needsReplan": boolean,
  "reason": "short explanation of why replan is or isn't needed",
  "confidenceScore": number (0-100 indicating confidence in progress)
}
`;

    const response = await llm.chat.completions.create({
        messages: [
            { role: "system", content: "You output only valid JSON. No markdown, no explanation." },
            { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 200,
    });

    const content = response.choices[0].message.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : "{}";

    try {
        const parsed = JSON.parse(jsonString);
        return {
            needsReplan: !!parsed.needsReplan,
            reason: parsed.reason || "Unable to determine",
            confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 50,
        };
    } catch {
        return { needsReplan: false, reason: "Parse error", confidenceScore: 50 };
    }
}

/**
 * Ask the LLM to produce a revised plan based on current context and reason.
 */
export async function replanFromContext(
    llm: OllamaClient,
    intent: Intent,
    ctx: ExecutionContext,
    completedSteps: number[],
    reason: string
): Promise<InvestigationPlan> {
    const prompt = `Create a REVISED step-by-step investigation plan due to a needed replan.

Reason for replan: ${reason}

Target: ${intent.target}
Type: ${intent.targetType}
Intent: ${intent.intent}
Scope: ${intent.scope}

Already completed steps: ${completedSteps.join(", ") || "None"}

Available tools (use ONLY these exact IDs):
- osint-gather: Collect OSINT data
- analyze-risk: Score risk and generate summary
- generate-recommendations: Produce actionable recommendations
- store-findings: Persist results to database
- discover-relationships: Map entity relationships
- deep-analysis: Behavioral profiling

Rules for REVISED plan:
- Generate a full plan from the current state to the end.
- You can restart from step 1 or continue with higher step numbers.
- "step" is the sequence number.
- "dependsOn" references the step number this step needs.
- Include "estimatedDuration" as a short string.

Respond with ONLY a JSON object:
{"steps":[{"step":1,"action":"...","tool":"...","priority":1}],"estimatedDuration":"5 minutes"}`;

    const response = await llm.chat.completions.create({
        messages: [
            { role: "system", content: "You output only valid JSON. No markdown, no explanation, no code fences." },
            { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
    });

    const content = response.choices[0].message.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;
    const parsed = JSON.parse(jsonString);
    const normalized = normalizePlanOutput(parsed, intent);
    return InvestigationPlanSchema.parse(normalized);
}

/**
 * Generate a comprehensive executive summary via LLM.
 */
export async function generateSummary(
    llm: OllamaClient,
    findings: OsintFindings,
    intent: Intent,
    riskScore: number
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

    const prompt = `You are a senior threat intelligence analyst writing a professional investigation report.

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
=== END DATA ===

Your summary MUST cover these areas in 3-4 paragraphs:

1. OVERVIEW: Who is the subject, what type of investigation was conducted, and what is the overall scope of their digital footprint.

2. DIGITAL PRESENCE ANALYSIS: Describe which platforms they were found on, emphasize the high-confidence findings, note the breadth of their online presence, and highlight any notable patterns (e.g., heavy social media usage, professional vs personal accounts).

3. RISK ASSESSMENT: Explain the ${riskLabel} risk score of ${riskScore}/10, what contributes to it (number of exposed profiles, data breaches, vulnerabilities), and what this means for the subject's security posture.

4. KEY FINDINGS: Highlight the most significant discoveries — any data breaches, exposed infrastructure, cross-platform identity links, or notable absences.

IMPORTANT: Write ONLY plain text paragraphs. Do NOT wrap your response in JSON, code blocks, or any structured format. Do NOT start with a heading or label. Begin directly with the first paragraph.`;

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
        max_tokens: 800,
    });

    let summary = response.choices[0].message.content || "No summary available.";

    // Strip any JSON wrapping the LLM might add despite instructions
    summary = summary.trim();
    // Remove markdown code fences if present
    summary = summary.replace(/^```[\s\S]*?```$/gm, "").trim();
    // If the response looks like JSON, try to extract the text value
    if (summary.startsWith("{")) {
        try {
            const parsed = JSON.parse(summary);
            // Dig into any nested structure to find the text
            const extractText = (obj: any): string => {
                if (typeof obj === "string") return obj;
                if (typeof obj === "object" && obj !== null) {
                    for (const val of Object.values(obj)) {
                        const result = extractText(val);
                        if (result && result.length > 50) return result;
                    }
                }
                return "";
            };
            const extracted = extractText(parsed);
            if (extracted) summary = extracted;
        } catch {
            // Not valid JSON, use as-is
        }
    }
    // Remove leading/trailing quotes
    summary = summary.replace(/^["']|["']$/g, "").trim();

    return summary;
}
