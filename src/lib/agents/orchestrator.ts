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
import { OsintAgent } from "./osint-agent";

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

      // Warmup: pre-load Ollama model into memory (handles cold-start)
      await this.llm.warmup();

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

Respond with ONLY a JSON object, no other text:`;

    const response = await this.llm.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You output only valid JSON. No markdown, no explanation, no code fences.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 200,
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

  private async createPlan(intent: Intent): Promise<InvestigationPlan> {
    const prompt = `Create a step-by-step investigation plan.

Target: ${intent.target}
Type: ${intent.targetType}
Intent: ${intent.intent}
Scope: ${intent.scope}

Available tools: osint-agent, searchUsername, extractEmails, extractDomains, calculateRisk, generateInsights

Example response format:
{"steps":[{"step":1,"action":"Search username across platforms","tool":"searchUsername","priority":1},{"step":2,"action":"Extract emails","tool":"extractEmails","priority":2}],"estimatedDuration":"15 minutes"}

Respond with ONLY a JSON object:`;

    const response = await this.llm.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You output only valid JSON. No markdown, no explanation, no code fences.",
        },
        {
          role: "user",
          content: prompt,
        },
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

  private async prepareEntity(intent: Intent, userId: string) {
    try {
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
    } catch (error) {
      console.warn(
        `⚠️ DB entity operation failed, using in-memory entity:`,
        error instanceof Error ? error.message : error
      );
      // Return a minimal in-memory entity so the investigation can proceed
      return {
        id: -1,
        name: intent.target,
        type: intent.targetType,
        userId,
        metadata: { source: "orchestrator-fallback" },
      };
    }
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
          content: "You are a investigative analyst writing executive summaries.", // Change to investigative analyst
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