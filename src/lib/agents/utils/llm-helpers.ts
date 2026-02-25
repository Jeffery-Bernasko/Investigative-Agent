import { OllamaClient } from "@/lib/ai/ollama-adapter";
import {
    Intent,
    IntentSchema,
    InvestigationPlan,
    InvestigationPlanSchema,
    OsintFindings,
} from "../types";

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
    return InvestigationPlanSchema.parse(parsed);
}

/**
 * Generate a concise executive summary via LLM.
 */
export async function generateSummary(
    llm: OllamaClient,
    findings: OsintFindings,
    intent: Intent,
    riskScore: number
): Promise<string> {
    const prompt = `
Generate a concise executive summary for this OSINT investigation:

Target: ${intent.target}
Type: ${intent.targetType}
Profiles Found: ${findings.profiles.length}
Platforms: ${findings.profiles.map((p) => p.platform).join(", ")}
Emails Found: ${findings.emails.length}
Domains Found: ${findings.domains.length}
Risk Score: ${riskScore}/10

Additional Intelligence:
${findings.metadata.emailIntel ? `- Email breaches: ${findings.metadata.emailIntel.breaches}` : ""}
${findings.metadata.domainIntel ? `- Domain vulnerabilities: ${findings.metadata.domainIntel.shodanVulns}` : ""}
${findings.metadata.phoneIntel ? `- Phone country: ${findings.metadata.phoneIntel.country}` : ""}

Provide a 2-3 sentence summary highlighting key findings and risks.
`;

    const response = await llm.chat.completions.create({
        messages: [
            {
                role: "system",
                content:
                    "You are a investigative analyst writing executive summaries.",
            },
            { role: "user", content: prompt },
        ],
        temperature: 0.2,
    });

    return response.choices[0].message.content || "No summary available.";
}
