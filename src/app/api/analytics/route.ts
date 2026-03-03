/**
 * Analytics API Endpoint
 *
 * Aggregates investigation quality metrics across all investigations
 * for the authenticated user.
 *
 * GET  /api/analytics         — User-level aggregate metrics
 * POST /api/analytics         — Record metrics for a completed investigation
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { investigationMetrics } from "@/lib/db/schema";
import { eq, desc, avg, count, sql } from "drizzle-orm";
import { getSafeErrorInfo } from "@/lib/agents/utils/errors";

// ── GET — aggregate dashboard metrics ────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Aggregate metrics for this user
    const [aggregates] = await db
      .select({
        totalInvestigations: count(),
        avgFalsePositiveRate: avg(investigationMetrics.falsePositiveRate),
        avgDurationMs: avg(investigationMetrics.investigationDurationMs),
        avgProfileCoverage: avg(investigationMetrics.profileCoverage),
        avgVerificationAccuracy: avg(investigationMetrics.verificationAccuracy),
        avgConfidence: avg(investigationMetrics.averageConfidence),
        avgTier1PassRate: avg(investigationMetrics.tier1PassRate),
        avgTier3AcceptanceRate: avg(investigationMetrics.tier3AcceptanceRate),
        disambiguationCount: sql<number | null>`sum(case when ${investigationMetrics.disambiguationTriggered} then 1 else 0 end)`,
      })
      .from(investigationMetrics)
      .where(eq(investigationMetrics.userId, userId));

    // Recent 10 investigations
    const recent = await db
      .select()
      .from(investigationMetrics)
      .where(eq(investigationMetrics.userId, userId))
      .orderBy(desc(investigationMetrics.createdAt))
      .limit(10);

    return NextResponse.json({
      success: true,
      metrics: {
        aggregate: {
          totalInvestigations: Number(aggregates.totalInvestigations ?? 0),
          averageFalsePositiveRate: aggregates.avgFalsePositiveRate
            ? Math.round(Number(aggregates.avgFalsePositiveRate) * 10) / 10
            : null,
          averageDurationSeconds: aggregates.avgDurationMs
            ? Math.round(Number(aggregates.avgDurationMs) / 1000)
            : null,
          averageProfileCoverage: aggregates.avgProfileCoverage
            ? Math.round(Number(aggregates.avgProfileCoverage) * 10) / 10
            : null,
          averageVerificationAccuracy: aggregates.avgVerificationAccuracy
            ? Math.round(Number(aggregates.avgVerificationAccuracy) * 10) / 10
            : null,
          averageConfidence: aggregates.avgConfidence
            ? Math.round(Number(aggregates.avgConfidence) * 10) / 10
            : null,
          tierFunnel: {
            averageTier1PassRate: aggregates.avgTier1PassRate
              ? Math.round(Number(aggregates.avgTier1PassRate) * 10) / 10
              : null,
            averageTier3AcceptanceRate: aggregates.avgTier3AcceptanceRate
              ? Math.round(Number(aggregates.avgTier3AcceptanceRate) * 10) / 10
              : null,
          },
          disambiguationTriggeredCount: Number(aggregates.disambiguationCount ?? 0),
        },
        recentInvestigations: recent,
      },
    });
  } catch (error: unknown) {
    const err = getSafeErrorInfo(error);
    return NextResponse.json(
      { error: "Failed to retrieve analytics", details: err.message },
      { status: 500 }
    );
  }
}

// ── POST — record metrics for a completed investigation ───────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      investigationId,
      falsePositiveRate,
      investigationDurationMs,
      profileCoverage,
      verificationAccuracy,
      averageConfidence,
      tier1PassRate,
      tier2CandidateCount,
      tier3AcceptanceRate,
      totalProfilesScanned,
      verifiedProfiles,
      rejectedProfiles,
      depth,
      disambiguationTriggered,
    } = body;

    if (!investigationId) {
      return NextResponse.json(
        { error: "investigationId is required" },
        { status: 400 }
      );
    }

    await db.insert(investigationMetrics).values({
      investigationId,
      userId: session.user.id,
      falsePositiveRate: falsePositiveRate ?? null,
      investigationDurationMs: investigationDurationMs ?? null,
      profileCoverage: profileCoverage ?? null,
      verificationAccuracy: verificationAccuracy ?? null,
      averageConfidence: averageConfidence ?? null,
      tier1PassRate: tier1PassRate ?? null,
      tier2CandidateCount: tier2CandidateCount ?? null,
      tier3AcceptanceRate: tier3AcceptanceRate ?? null,
      totalProfilesScanned: totalProfilesScanned ?? null,
      verifiedProfiles: verifiedProfiles ?? null,
      rejectedProfiles: rejectedProfiles ?? null,
      depth: depth ?? null,
      disambiguationTriggered: disambiguationTriggered ?? false,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = getSafeErrorInfo(error);
    return NextResponse.json(
      { error: "Failed to record metrics", details: err.message },
      { status: 500 }
    );
  }
}
