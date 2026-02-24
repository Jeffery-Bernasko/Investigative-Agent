import { NextRequest, NextResponse } from "next/server";
import { OrchestratorAgent } from "@/lib/agents/orchestrator";
import { auth } from "@/lib/auth";

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

export async function POST(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query string required" },
        { status: 400 }
      );
    }

    // Initialize orchestrator
    const orchestrator = new OrchestratorAgent();

    // Run autonomous investigation
    console.log(`\n Starting autonomous investigation for user ${session.user.id}`);
    const result = await orchestrator.investigate(query, session.user.id);

    return NextResponse.json({
      success: true,
      investigation: result,
    });
  } catch (error: unknown) {
    const err = getSafeErrorInfo(error);
    console.error(`Investigation API error: ${err.name}: ${err.message}`);
    if (err.stack) {
      console.error(err.stack);
    }

    return NextResponse.json(
      {
        error: "Investigation failed",
        details: err.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if investigation service is running
export async function GET() {
  return NextResponse.json({
    service: "Autonomous Investigation Orchestrator",
    status: "online",
    version: "1.0.0",
    capabilities: [
      "Natural language intent parsing",
      "Autonomous OSINT gathering",
      "AI-powered analysis",
      "Risk scoring",
      "Automated reporting",
    ],
  });
}
