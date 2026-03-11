import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entities, reports, userSettings } from "@/lib/db/schema";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import OpenAI from "openai";

// Ollama client adapter
import { OllamaClient, createOllamaClient } from "@/lib/ai/ollama-adapter";

// Create Azure OpenAI client using OpenAI SDK
function createAzureClient(endpoint: string, apiKey: string, deploymentName: string, apiVersion: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: `${endpoint}/openai/deployments/${deploymentName}`,
    defaultQuery: { "api-version": apiVersion },
    defaultHeaders: { "api-key": apiKey },
  });
}

// Get AI client based on user settings
/* async function getAIClient(userId?: string): Promise<{
  type: "azure" | "openai" | null;
  client: OpenAI | null;
  model?: string;
}> {
  if (userId) {
    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (settings.length > 0) {
      const s = settings[0];

      // Try Azure OpenAI first
      if (s.azureEndpoint && s.azureApiKey && s.azureDeploymentName) {
        return {
          type: "azure",
          client: createAzureClient(
            s.azureEndpoint,
            s.azureApiKey,
            s.azureDeploymentName,
            s.azureApiVersion || "2024-02-15-preview"
          ),
          model: "", // Model is in the URL for Azure
        };
      }

      // Fall back to OpenAI
      if (s.openaiApiKey) {
        return {
          type: "openai",
          client: new OpenAI({ apiKey: s.openaiApiKey }),
          model: s.defaultAiModel || "gpt-4",
        };
      }
    }
  }

  // Try environment variables as last resort
  if (process.env.OPENAI_API_KEY) {
    return {
      type: "openai",
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: "gpt-4",
    };
  }

  return { type: null, client: null };
} */

async function getAIClient(userId?: string): Promise<{
  type: "azure" | "openai" | "ollama" | null;
  client: OpenAI | OllamaClient | null;
  model?: string;
}> {
  // Try environment variables for Ollama first (NEW)
  if (process.env.OLLAMA_BASE_URL) {
    return {
      type: "ollama",
      client: createOllamaClient({
        baseUrl: process.env.OLLAMA_BASE_URL,
        model: process.env.OLLAMA_MODEL || "mistral",
      }),
      model: process.env.OLLAMA_MODEL || "mistral",
    };
  }

  if (userId) {
    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (settings.length > 0) {
      const s = settings[0];

      // Try Ollama from user settings (NEW)
      if (s.ollamaBaseUrl && s.ollamaModel) {
        return {
          type: "ollama",
          client: createOllamaClient({
            baseUrl: s.ollamaBaseUrl,
            model: s.ollamaModel,
          }),
          model: s.ollamaModel,
        };
      }

      // Try Azure OpenAI
      if (s.azureEndpoint && s.azureApiKey && s.azureDeploymentName) {
        return {
          type: "azure",
          client: createAzureClient(
            s.azureEndpoint,
            s.azureApiKey,
            s.azureDeploymentName,
            s.azureApiVersion || "2024-02-15-preview"
          ),
          model: "",
        };
      }

      // Fall back to OpenAI
      if (s.openaiApiKey) {
        return {
          type: "openai",
          client: new OpenAI({ apiKey: s.openaiApiKey }),
          model: s.defaultAiModel || "gpt-4",
        };
      }
    }
  }

  // Try environment variables for OpenAI as last resort
  if (process.env.OPENAI_API_KEY) {
    return {
      type: "openai",
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: "gpt-4",
    };
  }

  return { type: null, client: null };
}

// System prompt for the AI analyst
const SYSTEM_PROMPT = `You are SEPTO AI Analyst, an advanced threat intelligence assistant. You help security researchers analyze entities, threats, and relationships in their intelligence database.

Your capabilities:
- Analyze entities (people, organizations, domains, IPs, emails, etc.)
- Summarize threat reports and intelligence
- Find patterns and connections between entities
- Provide risk assessments and recommendations
- Answer questions about cybersecurity threats

When responding:
- Be concise but thorough
- Use technical language appropriately
- Cite specific data when available
- Highlight critical findings
- Suggest follow-up actions when relevant

Current context will be provided with each query including relevant entities and reports from the database.`;

// Search database for relevant context
async function getContextForQuery(query: string): Promise<string> {
  const queryLower = query.toLowerCase();

  // Search entities
  const relevantEntities = await db
    .select()
    .from(entities)
    .where(
      or(
        ilike(entities.name, `%${query}%`),
        ilike(entities.description, `%${query}%`),
        ilike(entities.email, `%${query}%`),
        ilike(entities.username, `%${query}%`)
      )
    )
    .limit(10);

  // Search reports
  const relevantReports = await db
    .select()
    .from(reports)
    .where(
      or(
        ilike(reports.title, `%${query}%`),
        ilike(reports.content, `%${query}%`)
      )
    )
    .limit(5);

  // Get high-risk entities if query mentions risk or threats
  let highRiskEntities: typeof relevantEntities = [];
  if (queryLower.includes("risk") || queryLower.includes("threat") || queryLower.includes("critical")) {
    highRiskEntities = await db
      .select()
      .from(entities)
      .where(sql`${entities.threatScore} >= 70`)
      .orderBy(desc(entities.threatScore))
      .limit(10);
  }

  // Get recent entities if query mentions recent or latest
  let recentEntities: typeof relevantEntities = [];
  if (queryLower.includes("recent") || queryLower.includes("latest") || queryLower.includes("new")) {
    recentEntities = await db
      .select()
      .from(entities)
      .orderBy(desc(entities.createdAt))
      .limit(10);
  }

  // Build context string
  let context = "";

  if (relevantEntities.length > 0) {
    context += "\n\n## Relevant Entities:\n";
    for (const entity of relevantEntities) {
      context += `- **${entity.name}** (${entity.type}): ${entity.description || "No description"}. Threat Score: ${entity.threatScore || 0}/100\n`;
      if (entity.email) context += `  - Email: ${entity.email}\n`;
      if (entity.socialProfiles) context += `  - Social Profiles: ${JSON.stringify(entity.socialProfiles)}\n`;
    }
  }

  if (highRiskEntities.length > 0) {
    context += "\n\n## High-Risk Entities:\n";
    for (const entity of highRiskEntities) {
      context += `- **${entity.name}** (${entity.type}): Threat Score ${entity.threatScore}/100 - ${entity.description || "No description"}\n`;
    }
  }

  if (recentEntities.length > 0) {
    context += "\n\n## Recent Entities:\n";
    for (const entity of recentEntities) {
      context += `- **${entity.name}** (${entity.type}): Added ${entity.createdAt?.toISOString()}\n`;
    }
  }

  if (relevantReports.length > 0) {
    context += "\n\n## Relevant Reports:\n";
    for (const report of relevantReports) {
      context += `- **${report.title}**: ${report.summary || report.content.slice(0, 200)}...\n`;
    }
  }

  // Get database stats
  const entityCount = await db.select({ count: sql`count(*)` }).from(entities);
  const reportCount = await db.select({ count: sql`count(*)` }).from(reports);

  context += `\n\n## Database Stats:\n- Total Entities: ${entityCount[0]?.count || 0}\n- Total Reports: ${reportCount[0]?.count || 0}\n`;

  return context || "\nNo specific context found for this query. Responding based on general knowledge.";
}

export async function POST(request: NextRequest) {
  try {
    const { message, userId, conversationHistory } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get AI client
    const { type, client, model } = await getAIClient(userId);

    if (!client) {
      return NextResponse.json(
        {
          error: "AI not configured",
          message: "Please configure your AI settings (Azure OpenAI or OpenAI API key) in Settings to use this feature.",
          needsConfiguration: true,
        },
        { status: 400 }
      );
    }

    // Get context from database
    const context = await getContextForQuery(message);

    // Build messages array
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) { // Last 10 messages
        if (msg.role && msg.content) {
          messages.push({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          });
        }
      }
    }

    // Add current message with context
    messages.push({
      role: "user",
      content: `${message}\n\n---\nDatabase Context:${context}`,
    });

    const completion = await client.chat.completions.create({
      model: model || "gpt-4",
      messages,
      max_tokens: 2048,
      temperature: 0.1,
    });

    const response = completion.choices[0]?.message?.content || "No response generated.";

    return NextResponse.json({
      success: true,
      response,
      contextUsed: context.length > 0,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to generate response",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
