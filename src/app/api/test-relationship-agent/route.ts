import { NextRequest, NextResponse } from "next/server";
import { RelationshipAgent } from "@/lib/agents/relationship-agent";
import { createOllamaClient } from "@/lib/ai/ollama-adapter";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { entityId } = await req.json();

    if (!entityId) {
      return NextResponse.json({ error: "Entity ID required" }, { status: 400 });
    }

    console.log(`\n🧪 Testing Relationship Agent for entity: ${entityId}`);

    // Initialize Relationship Agent
    const llm = createOllamaClient({
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "mistral",
    });

    const relationshipAgent = new RelationshipAgent({
      name: "Relationship Agent",
      llm,
      db,
    });

    // Execute task
    const result = await relationshipAgent.execute({
      entityId: entityId.toString(),
      description: "Discover and map relationships",
      target: entityId.toString(),
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Relationship Agent test error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}