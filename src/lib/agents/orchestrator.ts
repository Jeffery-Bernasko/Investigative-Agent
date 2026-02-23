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
  createEntity,
  storeOsintFindings,
  calculateRiskScore,
  generateInsights,
  extractEmails,
  extractDomains,
  searchWithTavily,
} from "./tools/osint-tools";
import { zodToJsonSchema } from "zod-to-json-schema";

export class OrchestratorAgent {
  private llm: OllamaClient;
  private db: any;

  constructor() {
    // Initialize Ollama client
    this.llm = createOllamaClient({
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "mistral",
    });

    this.db = db;
  }

  /**
   * Main entry point: Process user's natural language request
   */
  async investigate(userInput: string, userId: string): Promise<InvestigationResult> {
    const startTime = Date.now();
    const investigationId = crypto.randomUUID();

    console.log(`\n ============================================`);
    console.log(` ORCHESTRATOR: Starting Investigation`);
    console.log(` Query: "${userInput}"`);
    console.log(` Investigation ID: ${investigationId}`);
    console.log(` ============================================\n`);

    try {
      // Step 1: Parse user intent
      console.log(` Step 1: Parsing user intent...`);
      const intent = await this.parseIntent(userInput);
      console.log(` Intent parsed:`, JSON.stringify(intent, null, 2));

      // Step 2: Create investigation plan
      console.log(`\n Step 2: Creating investigation plan...`);
      const plan = await this.createPlan(intent);
      console.log(` Plan created:`, JSON.stringify(plan, null, 2));

      // Step 3: Prepare entity (create or find existing)
      console.log(`\n Step 3: Preparing entity...`);
      const entity = await this.prepareEntity(intent, userId);
      console.log(` Entity ready: ${entity.name} (ID: ${entity.id})`);

      // Step 4: Execute investigation
      console.log(`\n Step 4: Executing investigation plan...`);
      const findings = await this.executeInvestigation(intent, entity);
      console.log(` Investigation complete. Found ${findings.profiles.length} profiles.`);

      // Step 5: Analyze results
      console.log(`\n Step 5: Analyzing results...`);
      const analysis = await this.analyzeResults(findings, intent);
      console.log(` Analysis complete. Risk Score: ${analysis.riskScore}/10`);

      // Step 6: Generate recommendations
      console.log(`\n Step 6: Generating recommendations...`);
      const recommendations = await this.generateRecommendations(
        findings,
        analysis.riskScore
      );
      console.log(` Generated ${recommendations.length} recommendations.`);

      // Step 7: Store results
      console.log(`\n Step 7: Storing investigation results...`);
      await storeOsintFindings(entity.id, {
        findings,
        analysis,
        recommendations,
        investigationId,
      });

      const duration = Math.round((Date.now() - startTime) / 1000);

      console.log(`\n ============================================`);
      console.log(` INVESTIGATION COMPLETE`);
      console.log(` Duration: ${duration} seconds`);
      console.log(` ============================================\n`);

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
    } catch (error) {
      console.error(`\n Investigation failed:`, error);

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

  /**
   * Step 1: Parse natural language into structured intent
   */
    /**
   * Step 1: Parse natural language into structured intent
   */
  private async parseIntent(userInput: string): Promise<Intent> {
    const prompt = `
You are an intent parser for OSINT investigations. Parse the following user request and extract:

1. **target**: The specific entity to investigate
   - If it's a username (starts with @), return JUST the username without @
   - If it's a person's name (like "Elon Musk"), try to infer their likely username or return the name as-is
   - If it's an email, return the email
   - If it's a domain, return the domain
   - If it's an IP, return the IP

2. **targetType**: One of: "username", "email", "domain", "ip", "person", "organization"
   - Use "username" if input starts with @ or looks like a single-word handle
   - Use "person" if input is a person's full name (like "Elon Musk", "Bill Gates")
   - Use "email" if it contains @domain.com format
   - Use "domain" if it's a website address
   - Use "organization" if it's a company name

3. **intent**: One of: "investigate", "monitor", "analyze", "search"
   - Default to "investigate" unless user specifically asks to monitor or analyze

4. **scope**: One of: "quick" (5 min), "standard" (15 min), "deep" (1+ hour)
   - Default to "standard" unless specified

**IMPORTANT**: 
- For person names, also suggest a likely username in metadata
- For "@username", remove the @ symbol from target
- Be smart about inferring context

User request: "${userInput}"

Examples:
- "Investigate @elonmusk" → { target: "elonmusk", targetType: "username", intent: "investigate", scope: "standard" }
- "Investigate Elon Musk" → { target: "Elon Musk", targetType: "person", intent: "investigate", scope: "standard", metadata: { suggestedUsername: "elonmusk" } }
- "Check tesla.com" → { target: "tesla.com", targetType: "domain", intent: "investigate", scope: "quick" }
- "Deep analysis of john@example.com" → { target: "john@example.com", targetType: "email", intent: "analyze", scope: "deep" }

Respond ONLY with valid JSON matching this schema:
{
  "target": "string",
  "targetType": "username" | "email" | "domain" | "ip" | "person" | "organization",
  "intent": "investigate" | "monitor" | "analyze" | "search",
  "scope": "quick" | "standard" | "deep",
  "metadata"?: {
    "suggestedUsername"?: "string",
    "alternativeNames"?: ["string"]
  }
}
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
      temperature: 0.2,
    });

    const content = response.choices[0].message.content || "{}";

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;

    const parsed = JSON.parse(jsonString);
    
    // If targetType is "person" and we have a suggested username, add it to metadata
    if (parsed.targetType === "person" && !parsed.metadata?.suggestedUsername) {
      // Try to infer username from name (simple heuristic)
      const username = parsed.target.toLowerCase().replace(/\s+/g, '');
      parsed.metadata = { ...parsed.metadata, suggestedUsername: username };
    }
    
    return IntentSchema.parse(parsed);
  }

  /**
   * Step 2: Create investigation plan
   */
  private async createPlan(intent: Intent): Promise<InvestigationPlan> {
    const prompt = `
Create an investigation plan for the following target:

Target: ${intent.target}
Type: ${intent.targetType}
Intent: ${intent.intent}
Scope: ${intent.scope}

Available tools:
1. searchUsername - Search for username across multiple platforms (GitHub, Twitter, Instagram, LinkedIn, etc.)
2. extractEmails - Extract email addresses from gathered data
3. extractDomains - Extract domain names from gathered data
4. calculateRisk - Calculate risk score based on findings
5. generateInsights - Generate human-readable insights

Create a step-by-step plan with priorities (1=highest, 3=lowest).

Respond ONLY with valid JSON matching this schema:
${JSON.stringify(zodToJsonSchema(InvestigationPlanSchema), null, 2)}

Example:
{
  "steps": [
    { "step": 1, "action": "Search for username across platforms", "tool": "searchUsername", "priority": 1 },
    { "step": 2, "action": "Extract emails from findings", "tool": "extractEmails", "priority": 2 },
    { "step": 3, "action": "Calculate risk score", "tool": "calculateRisk", "priority": 3 }
  ],
  "estimatedDuration": "2-3 minutes"
}
`;

    const response = await this.llm.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a JSON-only investigation planner. Output valid JSON with no other text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;

    const parsed = JSON.parse(jsonString);
    return InvestigationPlanSchema.parse(parsed);
  }

  /**
   * Step 3: Prepare entity (create or find existing)
   */
  private async prepareEntity(intent: Intent, userId: string) {
    // Create new entity
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

      /**
   * Step 4: Execute investigation (ENHANCED for person names)
   */
  private async executeInvestigation(
    intent: Intent,
    entity: any
  ): Promise<OsintFindings> {
    const findings: OsintFindings = {
      profiles: [],
      emails: [],
      domains: [],
      metadata: {},
    };

    // For usernames, search directly
    if (intent.targetType === "username") {
      console.log(`🔍 Starting username search: ${intent.target}`);
      const result = await searchUsername(intent.target);
      findings.profiles = result.profiles.map(p => ({
        ...p,
        confidence: p.confidence || "medium"
      }));
    }
    
    // For person names, try suggested username AND search for the name
    else if (intent.targetType === "person") {
      console.log(`🔍 Investigating person: ${intent.target}`);
      
      // Try the suggested username first
      const suggestedUsername = (intent as any).metadata?.suggestedUsername;
      if (suggestedUsername) {
        console.log(`  💡 Trying suggested username: ${suggestedUsername}`);
        const usernameResult = await searchUsername(suggestedUsername);
        findings.profiles = usernameResult.profiles.map(p => ({
          ...p,
          confidence: p.confidence || "medium"
        }));
      }
      
      // Also try searching for the full name (Tavily will help here)
      console.log(`  🌐 Searching for full name: "${intent.target}"`);
      const tavilyKey = process.env.TAVILY_API_KEY;
      if (tavilyKey) {
        const nameResults = await searchWithTavily(
          `"${intent.target}" social media profile site:twitter.com OR site:linkedin.com OR site:instagram.com OR site:facebook.com`,
          tavilyKey
        );
        
        // Process name-based Tavily results
        nameResults.forEach((result) => {
          const url = result.url.toLowerCase();
          let platform = "Other";
          let profileUrl = result.url;
          
          // Extract username from URL
          let extractedUsername = "";
          
          if (url.includes("twitter.com/") || url.includes("x.com/")) {
            platform = "Twitter";
            const match = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
            if (match) extractedUsername = match[1];
            profileUrl = extractedUsername ? `https://twitter.com/${extractedUsername}` : result.url;
          } else if (url.includes("linkedin.com/in/")) {
            platform = "LinkedIn";
            const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
            if (match) extractedUsername = match[1];
            profileUrl = extractedUsername ? `https://linkedin.com/in/${extractedUsername}` : result.url;
          } else if (url.includes("instagram.com/")) {
            platform = "Instagram";
            const match = url.match(/instagram\.com\/([^\/\?]+)/);
            if (match) extractedUsername = match[1];
            profileUrl = extractedUsername ? `https://instagram.com/${extractedUsername}` : result.url;
          } else if (url.includes("facebook.com/")) {
            platform = "Facebook";
            const match = url.match(/facebook\.com\/([^\/\?]+)/);
            if (match) extractedUsername = match[1];
            profileUrl = extractedUsername ? `https://facebook.com/${extractedUsername}` : result.url;
          } else if (url.includes("github.com/")) {
            platform = "GitHub";
            const match = url.match(/github\.com\/([^\/\?]+)/);
            if (match) extractedUsername = match[1];
            profileUrl = extractedUsername ? `https://github.com/${extractedUsername}` : result.url;
          }
          
          // Check if we already have this platform
          const existing = findings.profiles.find(p => p.platform === platform);
          if (!existing) {
            console.log(`  ✨ Found ${platform} via name search: ${profileUrl}`);
            findings.profiles.push({
              platform,
              url: profileUrl,
              found: true,
              confidence: "high",
            });
            
            // Store extracted username in metadata
            if (extractedUsername) {
              findings.metadata[`${platform.toLowerCase()}Username`] = extractedUsername;
            }
          }
        });
      } else {
        console.log(`  ⚠️ Tavily not configured - person name search limited`);
      }
    }

    // Calculate statistics
    findings.metadata.searchedPlatforms = 20;
    findings.metadata.foundPlatforms = findings.profiles.filter((p) => p.found).length;
    findings.metadata.highConfidenceProfiles = findings.profiles.filter(
      (p) => p.confidence === "high"
    ).length;
    findings.metadata.mediumConfidenceProfiles = findings.profiles.filter(
      (p) => p.confidence === "medium"
    ).length;

    console.log(`\n✅ Investigation complete:`);
    console.log(`  Profiles found: ${findings.metadata.foundPlatforms}`);
    console.log(`  High confidence: ${findings.metadata.highConfidenceProfiles}`);
    console.log(`  Medium confidence: ${findings.metadata.mediumConfidenceProfiles}`);

    return findings;
  }

  /**
   * Step 5: Analyze results with AI
   */
  private async analyzeResults(findings: OsintFindings, intent: Intent) {
    // Calculate risk score
    const riskScore = calculateRiskScore(findings);

    // Generate AI-powered summary
    const summary = await this.generateSummary(findings, intent, riskScore);

    // Generate insights
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

Provide a 2-3 sentence summary highlighting key findings and risks.
`;

    const response = await this.llm.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a cybersecurity analyst writing executive summaries.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
    });

    return response.choices[0].message.content || "No summary available.";
  }

  /**
   * Step 6: Generate recommendations
   */
  private async generateRecommendations(
    findings: OsintFindings,
    riskScore: number
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Risk-based recommendations
    if (riskScore >= 7) {
      recommendations.push(" HIGH PRIORITY: Review and limit information exposure immediately");
      recommendations.push(" Enable 2FA on all identified accounts");
      recommendations.push(" Conduct full security audit of online presence");
    } else if (riskScore >= 4) {
      recommendations.push(" MEDIUM PRIORITY: Review privacy settings on active platforms");
      recommendations.push(" Monitor for unusual activity");
      recommendations.push(" Update passwords on identified accounts");
    } else {
      recommendations.push(" LOW RISK: Maintain current security posture");
      recommendations.push(" Schedule periodic monitoring");
    }

    // Finding-specific recommendations
    if (findings.profiles.length > 10) {
      recommendations.push(" Consider consolidating online presence to reduce attack surface");
    }

    if (findings.emails.length > 0) {
      recommendations.push(
        ` Check ${findings.emails.length} exposed email(s) against Have I Been Pwned`
      );
    }

    if (findings.domains.length > 0) {
      recommendations.push(` Review domain associations for accuracy and security`);
    }

    // General recommendation
    recommendations.push(" Generate full PDF report for documentation");

    return recommendations;
  }
}