import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { investigationTraces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const rows = await db
      .select()
      .from(investigationTraces)
      .where(eq(investigationTraces.id, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const trace = rows[0];

    // Don't leak existence of other users' traces
    if (trace.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: trace.id,
      target: trace.target,
      status: trace.status,
      steps: trace.steps,
      errors: trace.errors,
      totalLatencyMs: trace.totalLatencyMs,
      startedAt: trace.startedAt,
      completedAt: trace.completedAt,
      entityId: trace.entityId,
      createdAt: trace.createdAt,
    });
  } catch (error) {
    console.error("Failed to get investigation trace:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
