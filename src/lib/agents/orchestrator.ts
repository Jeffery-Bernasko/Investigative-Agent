import { createOllamaClient, OllamaClient } from "@/lib/ai/ollama-adapter";
import { db } from "@/lib/db";
import {
  Intent,
  IntentSchema,
  InvestigationPlan,
  InvestigationPlanSchema,
  InvestigationResult,
  OsintFindings,
} from "./types";
import {
  searchUsername,
  searchWithTavily,
  createEntity,
  getEntityByName,
  storeOsintFindings,
  calculateRiskScore,
  generateInsights,
  extractEmails,
  extractDomains,
} from "./tools/osint-tools";
import { OsintAgent } from "./osint-agent"; // ADD THIS
import { zodToJsonSchema } from "zod-to-json-schema";

type SafeErrorInfo = {
  name: string;
  message: string;
  stack?: string;
};

function getSafeErrorInfo(error: unknown): SafeErrorInfo {
  try {
    if (error instanceof Error) {
      return {
        name: error.name || "Error",
        message: error.message || "Unknown error",
        stack: error.stack,
      };
    }

    if (typeof error === "string") {
      return {
        name: "Error",
        message: error,
      };
    }

    return {
      name: "UnknownError",
      message: "A non-Error value was thrown",
    };
  } catch {
    return {
      name: "UnknownError",
      message: "Failed to parse thrown error safely",
    };
  }
}

// Helper: Detect if query is a person name vs username
function parseSearchQuery(query: string): {
  type: "username" | "person";
  cleanedQuery: string;
  suggestedUsername?: string;
} {
  const trimmed = query.trim();

  if (trimmed.startsWith("@")) {
    return {
      type: "username",
      cleanedQuery: trimmed.replace(/^@/, "").toLowerCase(), // Future check without converting to lowercase
    };
  }

  if (trimmed.includes(" ")) {
    const suggested = trimmed.toLowerCase().replace(/\s+/g, "");
    return {
      type: "person",
      cleanedQuery: trimmed,
      suggestedUsername: suggested,
    };
  }

  return {
    type: "username",
    cleanedQuery: trimmed.toLowerCase(),
  };
}
export class OrchestratorAgent {
  private llm: OllamaClient;
  private db: any;
  private osintAgent: OsintAgent; // ADD THIS

  constructor() {


    this.llm = createOllamaClient({
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "mistral",

    });

    this.db = db;

    // Initialize OSINT Agent
    this.osintAgent = new OsintAgent({
      name: "OSINT Agent",
      llm: this.llm,
      db: this.db,
    });
  }

  async investigate(userInput: string, userId: string): Promise<InvestigationResult> {
    const startTime = Date.now();
    const investigationId = crypto.randomUUID(); // Get a random UUD for investigation

    console.log(`\n🎯 ============================================`);
    console.log(`🎯 ORCHESTRATOR: Starting Investigation`);
    console.log(`🎯 Query: "${userInput}"`);
    console.log(`🎯 Investigation ID: ${investigationId}`);
    console.log(`🎯 ============================================\n`);

    try {


      // Step 1: Parse user intent
      console.log(`📝 Step 1: Parsing user intent...`);
      const intent = await this.parseIntent(userInput);
      console.log(`✅ Intent parsed:`, JSON.stringify(intent, null, 2));

      // Step 2: Create investigation plan
      console.log(`\n📋 Step 2: Creating investigation plan...`);
      const plan = await this.createPlan(intent);
      console.log(`✅ Plan created:`, JSON.stringify(plan, null, 2));

      // Step 3: Prepare entity
      console.log(`\n🔧 Step 3: Preparing entity...`);
      const entity = await this.prepareEntity(intent, userId);
      console.log(`✅ Entity ready: ${entity.name} (ID: ${entity.id})`);

      // Step 4: Execute investigation WITH OSINT AGENT
      console.log(`\n🚀 Step 4: Executing investigation with OSINT Agent...`);
      const findings = await this.executeInvestigationWithAgent(intent, entity);
      console.log(`✅ Investigation complete. Found ${findings.profiles.length} profiles.`);

      // Step 5: Analyze results
      console.log(`\n🧪 Step 5: Analyzing results...`);
      const analysis = await this.analyzeResults(findings, intent);
      console.log(`✅ Analysis complete. Risk Score: ${analysis.riskScore}/10`);

      // Step 6: Generate recommendations
      console.log(`\n💡 Step 6: Generating recommendations...`);
      const recommendations = await this.generateRecommendations(
        findings,
        analysis.riskScore
      );
      console.log(`✅ Generated ${recommendations.length} recommendations.`);

      // Step 7: Store results
      console.log(`\n💾 Step 7: Storing investigation results...`);
      await storeOsintFindings(entity.id, {
        findings,
        analysis,
        recommendations,
        investigationId,
      });

      const duration = Math.round((Date.now() - startTime) / 1000);

      console.log(`\n✅ ============================================`);
      console.log(`✅ INVESTIGATION COMPLETE`);
      console.log(`✅ Duration: ${duration} seconds`);
      console.log(`✅ ============================================\n`);

      return {
        investigationId,
        entity,
        status: "completed",
        findings,
        analysis,
        recommendations,
        duration,
        createdAt: new Date(),
      };
    } catch (error: unknown) {
      const err = getSafeErrorInfo(error);
      console.error(`\nInvestigation failed: ${err.name}: ${err.message}`);
      if (err.stack) {
        console.error(err.stack);
      }
      const duration = Math.round((Date.now() - startTime) / 1000);

      return {
        investigationId,
        entity: null as any,
        status: "failed",
        findings: { profiles: [], emails: [], domains: [], metadata: {} },
        recommendations: ["Investigation failed. Please try again."],
        duration,
        createdAt: new Date(),
      };
    }
  }

  private async parseIntent(userInput: string): Promise<Intent> {
    // Try LLM-based parsing first, fall back to deterministic parsing
    try {
      return await this.parseIntentWithLLM(userInput);
    } catch (error) {
      console.warn(
        `⚠️ LLM intent parsing failed, using deterministic fallback:`,
        error instanceof Error ? error.message : error
      );
      return this.fallbackParseIntent(userInput);
    }
  }

  private async parseIntentWithLLM(userInput: string): Promise<Intent> {
    const prompt = `
You are an intent parser for OSINT investigations. Parse the following user request and extract:

1. **target**: The specific entity to investigate
   - If it's a username (starts with @), return JUST the username without @
   - If it's a person's name (like "Elon Musk"), return the name as-is
   - If it's an email, return the email
   - If it's a domain, return the domain
   - If it's an IP, return the IP
   - If it's a phone number, return the phone number

2. **targetType**: One of: "username", "email", "domain", "ip", "person", "organization", "phone number"
   - Use "username" if input starts with @ or looks like a single-word handle
   - Use "person" if input is a person's full name (like "Elon Musk")
   - Use "email" if it contains @domain.com format
   - Use "domain" if it's a website address
   - Use "organization" if it's a company name
   - Use "phone number" if it contains + format

3. **intent**: One of: "investigate", "monitor", "analyze", "search"
   - Default to "investigate"

4. **scope**: One of: "quick" (5 min), "standard" (15 min), "deep" (1+ hour)
   - Default to "standard"

User request: "${userInput}"

Respond ONLY with valid JSON:
${JSON.stringify(zodToJsonSchema(IntentSchema), null, 2)}
`;

    const response = await this.llm.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a JSON-only intent parser. Output valid JSON with no other text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0].message.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;
    const parsed = JSON.parse(jsonString);

    if (parsed.targetType === "person" && !parsed.metadata?.suggestedUsername) {
      const username = parsed.target.toLowerCase().replace(/\s+/g, '');
      parsed.metadata = { ...parsed.metadata, suggestedUsername: username };
    }
    return IntentSchema.parse(parsed);
  }

  /**
   * Deterministic fallback parser — used when Ollama is unreachable or returns invalid JSON.
   * Extracts target, targetType, intent, and scope from the raw query using regex/heuristics.
   */
  private fallbackParseIntent(userInput: string): Intent {
    const trimmed = userInput.trim();

    // Strip common prefixes like "Investigate ", "Search for ", "Analyze ", "Monitor "
    const intentPatterns: { pattern: RegExp; intent: Intent["intent"] }[] = [
      { pattern: /^investigate\s+/i, intent: "investigate" },
      { pattern: /^monitor\s+/i, intent: "monitor" },
      { pattern: /^analyze\s+/i, intent: "analyze" },
      { pattern: /^search(?:\s+for)?\s+/i, intent: "search" },
      { pattern: /^look\s+(?:up|into)\s+/i, intent: "investigate" },
      { pattern: /^find\s+/i, intent: "search" },
    ];

    let intent: Intent["intent"] = "investigate";
    let remaining = trimmed;

    for (const { pattern, intent: matchedIntent } of intentPatterns) {
      if (pattern.test(remaining)) {
        intent = matchedIntent;
        remaining = remaining.replace(pattern, "").trim();
        break;
      }
    }

    // Detect scope hints
    let scope: Intent["scope"] = "standard";
    if (/\b(quick|fast|brief)\b/i.test(remaining)) {
      scope = "quick";
      remaining = remaining.replace(/\b(quick|fast|brief)\b/i, "").trim();
    } else if (/\b(deep|thorough|comprehensive|full)\b/i.test(remaining)) {
      scope = "deep";
      remaining = remaining.replace(/\b(deep|thorough|comprehensive|full)\b/i, "").trim();
    }

    // Clean up trailing punctuation and extra spaces
    remaining = remaining.replace(/[.!?]+$/, "").replace(/\s+/g, " ").trim();

    // Detect target type
    let target = remaining;
    let targetType: Intent["targetType"];
    const metadata: { suggestedUsername?: string; alternativeNames?: string[] } = {};

    // Email: user@domain.com
    const emailMatch = remaining.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
    if (emailMatch) {
      target = emailMatch[0];
      targetType = "email";
    }
    // IP address: 1.2.3.4
    else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(remaining)) {
      targetType = "ip";
    }
    // Domain: example.com (no spaces, has a dot, no @)
    else if (/^[\w.-]+\.\w{2,}$/.test(remaining) && !remaining.includes("@") && !remaining.includes(" ")) {
      targetType = "domain";
    }
    // Username: starts with @
    else if (remaining.startsWith("@")) {
      target = remaining.slice(1);
      targetType = "username";
    }
    // Person name: contains spaces (multi-word)
    else if (remaining.includes(" ")) {
      targetType = "person";
      metadata.suggestedUsername = remaining.toLowerCase().replace(/\s+/g, "");
    }
    // Single word: treat as username
    else {
      targetType = "username";
    }

    console.log(`📋 Fallback parser result: target="${target}", type="${targetType}", intent="${intent}", scope="${scope}"`);

    return IntentSchema.parse({
      target,
      targetType,
      intent,
      scope,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });
  }

  private async createPlan(intent: Intent): Promise<InvestigationPlan> {
    try {
      return await this.createPlanWithLLM(intent);
    } catch (error) {
      console.warn(
        `⚠️ LLM plan creation failed, using deterministic fallback:`,
        error instanceof Error ? error.message : error
      );
      return this.fallbackCreatePlan(intent);
    }
  }

  private async createPlanWithLLM(intent: Intent): Promise<InvestigationPlan> {
    const prompt = `
Create an investigation plan for the following target:

Target: ${intent.target}
Type: ${intent.targetType}
Intent: ${intent.intent}
Scope: ${intent.scope}

Available agents and tools:
1. OSINT Agent - Comprehensive data gathering (username, email, domain, phone)
2. searchUsername - Search for username across platforms
3. extractEmails - Extract email addresses
4. extractDomains - Extract domain names
5. calculateRisk - Calculate risk score
6. generateInsights - Generate insights

Create a step-by-step plan.

Respond ONLY with valid JSON:
${JSON.stringify(zodToJsonSchema(InvestigationPlanSchema), null, 2)}
`;

    const response = await this.llm.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a JSON-only investigation planner. Output valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    const content = response.choices[0].message.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;
    const parsed = JSON.parse(jsonString);
    return InvestigationPlanSchema.parse(parsed);
  }

  private fallbackCreatePlan(intent: Intent): InvestigationPlan {
    const baseSteps = [
      { step: 1, action: `Gather OSINT data for ${intent.targetType}: ${intent.target}`, tool: "osint-agent", priority: 1 },
      { step: 2, action: "Search username across platforms", tool: "searchUsername", priority: 1 },
      { step: 3, action: "Extract associated emails", tool: "extractEmails", priority: 2 },
      { step: 4, action: "Extract associated domains", tool: "extractDomains", priority: 2 },
      { step: 5, action: "Calculate risk score", tool: "calculateRisk", priority: 1 },
      { step: 6, action: "Generate insights and recommendations", tool: "generateInsights", priority: 1 },
    ];

    const durationMap = { quick: "5 minutes", standard: "15 minutes", deep: "60+ minutes" };

    console.log(`📋 Fallback plan created with ${baseSteps.length} steps`);
    return InvestigationPlanSchema.parse({
      steps: baseSteps,
      estimatedDuration: durationMap[intent.scope] || "15 minutes",
    });
  }

  private async prepareEntity(intent: Intent, userId: string) {
    const existing = await getEntityByName(intent.target, userId);

    if (existing) {
      console.log(`📦 Found existing entity: ${intent.target}`);
      return existing;
    }

    console.log(`✨ Creating new entity: ${intent.target}`);
    return await createEntity({
      name: intent.target,
      type: intent.targetType,
      userId,
      metadata: {
        source: "orchestrator",
        intent: intent.intent,
        scope: intent.scope,
      },
    });
  }

  // NEW: Execute investigation using OSINT Agent
  private async executeInvestigationWithAgent(
    intent: Intent,
    entity: any
  ): Promise<OsintFindings> {
    const findings: OsintFindings = {
      profiles: [],
      emails: [],
      domains: [],
      metadata: {},
    };

    // Determine the target to investigate
    let targetToInvestigate = intent.target;

    // For person names, use suggested username or known mapping
    if (intent.targetType === "person") {
      const parsed = parseSearchQuery(intent.target);
      //const knownUsername = KNOWN_USERNAMES[intent.target.toLowerCase()];
      targetToInvestigate = parsed.suggestedUsername || intent.target;
      console.log(`👤 Person detected: "${intent.target}" → using username: "${targetToInvestigate}"`);
    }

    // Use OSINT Agent to gather intelligence
    console.log(`🤖 Delegating to OSINT Agent...`);
    const osintResult = await this.osintAgent.execute({
      entityId: entity.id.toString(),
      description: `Gather comprehensive OSINT on ${intent.targetType}`,
      target: targetToInvestigate,
      metadata: { originalTarget: intent.target, targetType: intent.targetType },
    });

    if (!osintResult.success) {
      console.error(`❌ OSINT Agent failed:`, osintResult.error);
      return findings;
    }

    // Process OSINT Agent results
    const agentData = osintResult.data;

    // Username results
    if (agentData.username) {
      findings.profiles = agentData.username.profiles || [];
      console.log(`✅ Username: Found ${findings.profiles.length} profiles`);
    }

    // Email results
    if (agentData.email) {
      findings.emails = [agentData.email.email];
      findings.metadata.emailIntel = {
        valid: agentData.email.isValid,
        disposable: agentData.email.isDisposable,
        breaches: agentData.email.breaches.length,
        breachDetails: agentData.email.breaches,
        gravatar: agentData.email.gravatar.exists,
        hunterScore: agentData.email.hunter.score,
      };
      console.log(`  ✅ Email: Valid=${agentData.email.isValid}, Breaches=${agentData.email.breaches.length}`);
    }

    // Domain results
    if (agentData.domain) {
      findings.domains = [agentData.domain.domain];
      findings.metadata.domainIntel = {
        dns: agentData.domain.dns,
        ssl: agentData.domain.ssl.valid,
        shodanPorts: agentData.domain.shodan.ports?.length || 0,
        shodanVulns: agentData.domain.shodan.vulns?.length || 0,
        virusTotalMalicious: agentData.domain.virusTotal.malicious || 0,
      };
      console.log(`  ✅ Domain: SSL=${agentData.domain.ssl.valid}, DNS=${agentData.domain.dns.a.length} A records`);
    }

    // Phone results,, add more metadata for number using APIs
    if (agentData.phone) {
      findings.metadata.phoneIntel = {
        valid: agentData.phone.isValid,
        country: agentData.phone.country?.name,
        format: agentData.phone.format.international,
      };
      console.log(`  ✅ Phone: Valid=${agentData.phone.isValid}, Country=${agentData.phone.country?.name}`);
    }

    // For person names, also do Tavily search
    if (intent.targetType === "person") {
      console.log(`\n🌐 Enriching person search with Tavily...`);
      const tavilyKey = process.env.TAVILY_API_KEY;
      if (tavilyKey) {
        const nameResults = await searchWithTavily(
          `"${intent.target}" social media profile site:x.com OR site:linkedin.com OR site:instagram.com OR site:github.com OR site:facebook.com`,
          tavilyKey
        );

        nameResults.forEach((result) => {
          const url = result.url.toLowerCase();
          let platform = "Other";
          let profileUrl = result.url;

          if (url.includes("x.com/")) {
            platform = "X";
            const match = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
            if (match) profileUrl = `https://x.com/${match[1]}`;
          } else if (url.includes("linkedin.com/in/")) {
            platform = "LinkedIn";
            profileUrl = result.url;
          } else if (url.includes("instagram.com/")) {
            platform = "Instagram";
            const match = url.match(/instagram\.com\/([^\/\?]+)/);
            if (match) profileUrl = `https://instagram.com/${match[1]}`;
          } else if (url.includes("github.com/")) {
            platform = "GitHub";
            const match = url.match(/github\.com\/([^\/\?]+)/);
            if (match) profileUrl = `https://github.com/${match[1]}`;
          } else if (url.includes("facebook.com/")) {
            platform = "Facebook";
            profileUrl = result.url;
          }

          const existing = findings.profiles.find(p => p.platform === platform);
          if (!existing && platform !== "Other") {
            console.log(`  ✨ Found ${platform} via name search`);
            findings.profiles.push({
              platform,
              url: profileUrl,
              found: true,
              confidence: "high",
            });
          } else if (existing && existing.confidence !== "high") {
            console.log(`  ⬆️ Upgraded ${platform} to high confidence`);
            existing.confidence = "high";
            existing.url = profileUrl;
          }
        });
      }
    }

    // Statistics
    findings.metadata.searchedPlatforms = 20;
    findings.metadata.foundPlatforms = findings.profiles.filter((p) => p.found).length;
    findings.metadata.highConfidenceProfiles = findings.profiles.filter(
      (p) => p.confidence === "high"
    ).length;
    findings.metadata.mediumConfidenceProfiles = findings.profiles.filter(
      (p) => p.confidence === "medium"
    ).length;
    findings.metadata.osintAgentConfidence = osintResult.confidence;

    return findings;
  }

  private async analyzeResults(findings: OsintFindings, intent: Intent) {
    const riskScore = calculateRiskScore(findings);
    const summary = await this.generateSummary(findings, intent, riskScore);
    const insights = generateInsights(findings, riskScore);

    return {
      riskScore,
      summary,
      insights,
    };
  }

  private async generateSummary(
    findings: OsintFindings,
    intent: Intent,
    riskScore: number
  ): Promise<string> {
    try {
      return await this.generateSummaryWithLLM(findings, intent, riskScore);
    } catch (error) {
      console.warn(
        `⚠️ LLM summary generation failed, using template fallback:`,
        error instanceof Error ? error.message : error
      );
      return this.fallbackGenerateSummary(findings, intent, riskScore);
    }
  }

  private async generateSummaryWithLLM(
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

    const response = await this.llm.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an investigative analyst writing executive summaries.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    return response.choices[0].message.content || "No summary available.";
  }

  private fallbackGenerateSummary(
    findings: OsintFindings,
    intent: Intent,
    riskScore: number
  ): string {
    const platforms = findings.profiles.filter(p => p.found).map(p => p.platform);
    const riskLevel = riskScore >= 7 ? "HIGH" : riskScore >= 4 ? "MEDIUM" : "LOW";

    let summary = `OSINT investigation of ${intent.targetType} "${intent.target}" identified ${findings.profiles.length} profiles across ${platforms.length > 0 ? platforms.join(", ") : "no platforms"}.`;

    if (findings.emails.length > 0) {
      summary += ` ${findings.emails.length} email address(es) discovered.`;
    }
    if (findings.metadata.emailIntel?.breaches > 0) {
      summary += ` WARNING: ${findings.metadata.emailIntel.breaches} data breach(es) detected.`;
    }
    if (findings.metadata.domainIntel?.shodanVulns > 0) {
      summary += ` ${findings.metadata.domainIntel.shodanVulns} domain vulnerability(ies) found.`;
    }

    summary += ` Overall risk assessment: ${riskLevel} (${riskScore}/10).`;
    return summary;
  }

  private async generateRecommendations(
    findings: OsintFindings,
    riskScore: number
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Risk-based recommendations
    if (riskScore >= 7) {
      recommendations.push("🔴 HIGH PRIORITY: Review and limit information exposure immediately");
      recommendations.push("🔒 Enable 2FA on all identified accounts");
      recommendations.push("🔍 Conduct full security audit of online presence");
    } else if (riskScore >= 4) {
      recommendations.push("🟡 MEDIUM PRIORITY: Review privacy settings on active platforms");
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
      recommendations.push("📱 Consider consolidating online presence to reduce attack surface");
    }

    if (findings.emails.length > 0) {
      recommendations.push(`📧 Check exposed emails against Have I Been Pwned`);
    }
    recommendations.push("📊 Generate full PDF report for documentation");
    return recommendations;
  }
}