import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { osintSearches, userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { OrchestratorAgent } from "@/lib/agents/orchestrator";

// Rate limiting: simple in-memory store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitStore.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (limit.count >= 20) { // Increased to 20 requests per minute
    return false;
  }

  limit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    console.log("\n🔍 ===== OSINT SEARCH API =====");

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    if (!checkRateLimit(ip)) {
      console.log("❌ Rate limit exceeded for IP:", ip);
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before making more requests." },
        { status: 429 }
      );
    }

    // Get session
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;

    const body = await request.json();
    const { searchType = "username", query, username } = body;

    // Support both 'query' and 'username' parameters
    const searchQuery = query || username;

    if (!searchQuery) {
      console.log("❌ Missing query parameter");
      return NextResponse.json(
        { error: "Missing search query" },
        { status: 400 }
      );
    }

    console.log(`📋 Search Type: ${searchType}`);
    console.log(`🎯 Query: ${searchQuery}`);
    console.log(`👤 User: ${userId || "Anonymous"}`);

    const startTime = Date.now();

    // Delegate to Orchestrator Agent
    const orchestrator = new OrchestratorAgent();
    // The orchestrator's LLM intent parsing handles string queries nicely.
    // e.g. "Find username sko"
    const invResult = await orchestrator.investigate(`Search for ${searchType} ${searchQuery}`, userId || "anonymous");

    if (invResult.status === "failed") {
      return NextResponse.json(
        { error: "Investigation failed via orchestrator" },
        { status: 500 }
      );
    }
    // Map the standard findings schema over to the legacy API format
    const findings = invResult.findings;
    const platforms: any[] = [];

    findings.profiles.forEach((p) => {
      platforms.push({
        name: p.platform,
        url: p.url,
        exists: p.found,
        confidence: p.confidence,
        category: "Social Media",
      });
    });

    findings.emails.forEach((e) => {
      platforms.push({
        name: e.address,
        url: undefined,
        exists: true,
        confidence: e.data?.confidence || "high",
        category: "Email",
        data: e.data,
      });
    });

    findings.domains.forEach((d) => {
      platforms.push({
        name: d.domain,
        url: undefined,
        exists: true,
        confidence: "high",
        category: "Domain",
        data: d.data,
      });
    });

    if (findings.phones) {
      findings.phones.forEach((p) => {
        platforms.push({
          name: p.number,
          url: undefined,
          exists: true,
          confidence: "high",
          category: "Phone",
          data: p.data,
        });
      });
    }

    const duration = Date.now() - startTime;
    const summary = `Found ${platforms.length} results for "${searchQuery}" across multiple platforms via Orchestrator.`;
    const webResults = findings.webResults || [];

    // Optional legacy table integration
    // We can still push to `osintSearches` if frontend pages need `GET /api/osint/search`
    if (userId) {
      try {
        const searchRecord = await db
          .insert(osintSearches)
          .values({
            userId: userId || null,
            searchType: searchType as any,
            query: searchQuery,
            results: {
              platforms,
              summary,
            },
            status: "completed",
            completedAt: new Date(),
          })
          .returning();
        console.log(`💾 Stored search record: ${searchRecord[0].id}`);
      } catch (dbError) {
        console.error("❌ Failed to store search record (legacy table):", dbError);
      }
    }

    console.log(`\n✅ ===== SEARCH COMPLETE (${duration}ms) =====\n`);
    return NextResponse.json({
      success: true,
      searchType,
      query: searchQuery,
      platforms,
      summary,
      webResults,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("\n❌ OSINT search error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "10");

    const searches = await db
      .select()
      .from(osintSearches)
      .where(userId ? eq(osintSearches.userId, userId) : undefined)
      .orderBy(osintSearches.createdAt)
      .limit(limit);

    return NextResponse.json({ searches });
  } catch (error) {
    console.error("Failed to get OSINT searches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}