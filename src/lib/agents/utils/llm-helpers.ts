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

Available tools: osint-agent, searchUsername, extractEmails, extractDomains, calculateRisk, generateInsights

Example response format:
{"steps":[{"step":1,"action":"Search username across platforms","tool":"searchUsername","priority":1},{"step":2,"action":"Extract emails","tool":"extractEmails","priority":2}],"estimatedDuration":"15 minutes"}

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
