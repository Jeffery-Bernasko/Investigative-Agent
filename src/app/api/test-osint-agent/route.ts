import { NextRequest, NextResponse } from "next/server";
import { OsintAgent } from "@/lib/agents/osint-agent";
import { createOllamaClient } from "@/lib/ai/ollama-adapter";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { target, type } = await req.json();

    if (!target) {
      return NextResponse.json({ error: "Target required" }, { status: 400 });
    }

    console.log(`\n Testing OSINT Agent with target: ${target}`);

    // Initialize OSINT Agent
    const llm = createOllamaClient({
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "mistral",
    });

    const osintAgent = new OsintAgent({
      name: "OSINT Agent",
      llm,
      db,
    });

    // Execute task
    const result = await osintAgent.execute({
      entityId: "test",
      description: `Gather ${type || "all"} intelligence on target`,
      target,
      metadata: { type },
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("OSINT Agent test error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}