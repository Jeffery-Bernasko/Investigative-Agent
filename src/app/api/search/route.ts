import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entities, reports, vectors, userSettings } from "@/lib/db/schema";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import OpenAI from "openai";

// Create Ollama client
import { createOllamaClient } from "@/lib/ai/ollama-adapter";

// Create Azure OpenAI client using OpenAI SDK
function createAzureClient(endpoint: string, apiKey: string, deploymentName: string, apiVersion: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: `${endpoint}/openai/deployments/${deploymentName}`,
    defaultQuery: { "api-version": apiVersion },
    defaultHeaders: { "api-key": apiKey },
  });
}

// Get embedding from OpenAI or Azure
async function getEmbedding(
  text: string,
  userId?: string
): Promise<number[] | null> {
  if (!userId) {
    // Try environment variable

     if (process.env.OLLAMA_BASE_URL) {
    try {
      const client = createOllamaClient({
        baseUrl: process.env.OLLAMA_BASE_URL,
        model: "nomic-embed-text",
      });
      
      const response = await client.embeddings.create({
        input: text,
      });
      
      return response.data[0]?.embedding || null;
    } catch (error) {
      console.error("Ollama embedding failed:", error);
      // Fall through to other options
    }
  }
    if (process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
      });
      return response.data[0]?.embedding || null;
    }
    return null;
  }

  // Get user settings
  const settings = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (settings.length === 0) {
    return null;
  }

  const s = settings[0];

  // Try Azure first
  if (s.azureEndpoint && s.azureApiKey) {
    try {
      // Use a separate embedding deployment or the chat deployment
      const embeddingDeployment = "text-embedding-ada-002"; // Default embedding model
      const client = createAzureClient(
        s.azureEndpoint,
        s.azureApiKey,
        embeddingDeployment,
        s.azureApiVersion || "2024-02-15-preview"
      );

      const response = await client.embeddings.create({
        model: "",
        input: text,
      });

      return response.data[0]?.embedding || null;
    } catch (error) {
      console.error("Azure embedding failed:", error);
    }
  }

  // Fall back to OpenAI
  if (s.openaiApiKey) {
    try {
      const client = new OpenAI({ apiKey: s.openaiApiKey });
      const response = await client.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
      });
      return response.data[0]?.embedding || null;
    } catch (error) {
      console.error("OpenAI embedding failed:", error);
    }
  }

  return null;
}

// Keyword-based search (fallback when vector search unavailable)
async function keywordSearch(query: string, limit: number = 20) {
  const entityResults = await db
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
    .orderBy(desc(entities.threatScore))
    .limit(limit);

  const reportResults = await db
    .select()
    .from(reports)
    .where(
      or(
        ilike(reports.title, `%${query}%`),
        ilike(reports.content, `%${query}%`),
        ilike(reports.summary, `%${query}%`)
      )
    )
    .orderBy(desc(reports.createdAt))
    .limit(limit);

  return {
    entities: entityResults.map((e) => ({
      ...e,
      score: 1, // No similarity score for keyword search
      matchType: "keyword",
    })),
    reports: reportResults.map((r) => ({
      ...r,
      score: 1,
      matchType: "keyword",
    })),
    searchType: "keyword",
  };
}

// Vector similarity search
async function vectorSearch(embedding: number[], limit: number = 20) {
  // Use pgvector cosine similarity search
  const embeddingStr = `[${embedding.join(",")}]`;

  try {
    // Search vectors and join with entities/reports
    const vectorResults = await db.execute(sql`
      SELECT 
        v.id as vector_id,
        v.entity_id,
        v.report_id,
        v.text,
        1 - (v.embedding <=> ${embeddingStr}::vector) as similarity
      FROM vectors v
      WHERE v.embedding IS NOT NULL
      ORDER BY v.embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `);

    const results = vectorResults.rows as Array<{
      vector_id: number;
      entity_id: number | null;
      report_id: number | null;
      text: string;
      similarity: number;
    }>;

    // Fetch related entities and reports
    const entityIds = results.filter((r) => r.entity_id).map((r) => r.entity_id!);
    const reportIds = results.filter((r) => r.report_id).map((r) => r.report_id!);

    let entityResults: (typeof entities.$inferSelect)[] = [];
    let reportResults: (typeof reports.$inferSelect)[] = [];

    if (entityIds.length > 0) {
      entityResults = await db
        .select()
        .from(entities)
        .where(sql`${entities.id} = ANY(${entityIds})`);
    }

    if (reportIds.length > 0) {
      reportResults = await db
        .select()
        .from(reports)
        .where(sql`${reports.id} = ANY(${reportIds})`);
    }

    // Map results with similarity scores
    return {
      entities: results
        .filter((r) => r.entity_id)
        .map((r) => {
          const entity = entityResults.find((e) => e.id === r.entity_id);
          return {
            ...entity,
            score: r.similarity,
            matchedText: r.text,
            matchType: "vector",
          };
        })
        .filter((e) => e.id),
      reports: results
        .filter((r) => r.report_id)
        .map((r) => {
          const report = reportResults.find((rep) => rep.id === r.report_id);
          return {
            ...report,
            score: r.similarity,
            matchedText: r.text,
            matchType: "vector",
          };
        })
        .filter((r) => r.id),
      searchType: "vector",
    };
  } catch (error) {
    console.error("Vector search failed:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, userId, limit = 20, useVectorSearch = true } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    let results;

    if (useVectorSearch) {
      // Try vector search first
      const embedding = await getEmbedding(query, userId);

      if (embedding) {
        const vectorResults = await vectorSearch(embedding, limit);
        if (vectorResults) {
          results = vectorResults;
        }
      }
    }

    // Fall back to keyword search
    if (!results) {
      results = await keywordSearch(query, limit);
    }

    // Get total counts
    const entityCount = await db
      .select({ count: sql`count(*)` })
      .from(entities);
    const reportCount = await db
      .select({ count: sql`count(*)` })
      .from(reports);

    return NextResponse.json({
      success: true,
      query,
      results,
      totalEntities: Number(entityCount[0]?.count || 0),
      totalReports: Number(reportCount[0]?.count || 0),
    });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

// Index content for vector search
export async function PUT(request: NextRequest) {
  try {
    const { type, id, text, userId } = await request.json();

    if (!type || !id || !text) {
      return NextResponse.json(
        { error: "type, id, and text are required" },
        { status: 400 }
      );
    }

    // Get embedding
    const embedding = await getEmbedding(text, userId);

    if (!embedding) {
      return NextResponse.json(
        { error: "Failed to generate embedding. Check AI configuration." },
        { status: 400 }
      );
    }

    // Store vector
    const vectorData: {
      entityId?: number;
      reportId?: number;
      embedding: number[];
      text: string;
    } = {
      embedding,
      text,
    };

    if (type === "entity") {
      vectorData.entityId = id;
    } else if (type === "report") {
      vectorData.reportId = id;
    }

    await db.insert(vectors).values(vectorData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Indexing failed:", error);
    return NextResponse.json(
      { error: "Indexing failed" },
      { status: 500 }
    );
  }
}
