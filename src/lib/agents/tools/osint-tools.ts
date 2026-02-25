/**
 * OSINT Tools — DB operations, analysis utilities, and barrel re-exports.
 *
 */
import { db } from "@/lib/db";
import { entities, osintSearches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { OsintFindings } from "../types";

export { searchUsername } from "./username-search";
export { searchPersonByName } from "./person-search";
export { searchWithTavily } from "./tavily-search";

export function extractEmails(text: string): string[] {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  return [...new Set(text.match(emailRegex) || [])];
}

export function extractDomains(text: string): string[] {
  const domainRegex =
    /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\b/gi;
  const domains = text.match(domainRegex) || [];
  return [...new Set(domains)].filter((d) => !d.includes("@"));
}

export async function createEntity(data: {
  name: string;
  type: string;
  userId: string;
  metadata?: Record<string, any>;
}) {
  console.log(`✨ Creating entity: ${data.name}`);
  const newEntity = await db
    .insert(entities)
    .values({
      name: data.name,
      type: data.type as any,
      userId: data.userId,
      metadata: data.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return newEntity[0];
}

export async function storeOsintFindings(entityId: number, findings: any) {
  console.log(`💾 Storing OSINT findings for entity: ${entityId}`);
  try {
    await db
      .update(entities)
      .set({
        osintData: findings,
        updatedAt: new Date(),
      })
      .where(eq(entities.id, entityId));

    await db.insert(osintSearches).values({
      entityId,
      searchType: "username",
      query: findings.entity?.name || "unknown",
      results: {
        platforms: findings.findings?.profiles || [],
        summary: findings.analysis?.summary || "",
      },
      status: "completed",
      createdAt: new Date(),
      completedAt: new Date(),
    });
    console.log(` ✅ Findings stored successfully`);
  } catch (error) {
    console.error(`❌ Error storing findings:`, error);
    throw error;
  }
}

export async function getEntityByName(name: string, userId: string) {
  try {
    const result = await db
      .select()
      .from(entities)
      .where(eq(entities.name, name))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.warn(
      `⚠️ DB query for entity "${name}" failed, treating as new entity:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

export function calculateRiskScore(findings: OsintFindings): number {
  let score = 0;
  const profiles = findings.profiles || [];
  const highConfidence = profiles.filter(
    (p: any) => p.confidence === "high"
  ).length;
  const mediumConfidence = profiles.filter(
    (p: any) => p.confidence === "medium"
  ).length;
  const weightedFootprint = highConfidence * 1.0 + mediumConfidence * 0.6;
  const footprintScore = Math.min(weightedFootprint / 3, 4);
  score += footprintScore;
  const emailScore = Math.min((findings.emails?.length || 0) * 1.5, 3);
  score += emailScore;
  const domainScore = Math.min(findings.domains?.length || 0, 2);
  score += domainScore;
  if (highConfidence > 0) score += 1;
  return Math.min(Math.round(score), 10);
}

export function generateInsights(
  findings: OsintFindings,
  riskScore: number
): string[] {
  const insights: string[] = [];
  const totalProfiles = findings.profiles?.length || 0;
  const highConfidence =
    findings.profiles?.filter((p: any) => p.confidence === "high").length || 0;
  const mediumConfidence =
    findings.profiles?.filter((p: any) => p.confidence === "medium").length ||
    0;

  if (totalProfiles === 0) {
    insights.push(
      "⚪ No online profiles found. Target has minimal digital footprint."
    );
  } else {
    insights.push(
      `🔵 Found ${totalProfiles} verified profile${totalProfiles > 1 ? "s" : ""} (${highConfidence} high confidence, ${mediumConfidence} medium).`
    );
  }

  const platforms = findings.profiles
    ?.filter((p: any) => p.found)
    .map((p: any) => p.platform)
    .slice(0, 8)
    .join(", ");
  if (platforms) {
    const remaining = totalProfiles - 8;
    insights.push(
      `📱 Active on: ${platforms}${remaining > 0 ? ` and ${remaining} more` : ""}`
    );
  }

  if (findings.emails && findings.emails.length > 0) {
    insights.push(
      `📧 ${findings.emails.length} email address(es) discovered. Recommend breach checking.`
    );
  }

  if (findings.domains && findings.domains.length > 0) {
    insights.push(
      `🌐 Associated with ${findings.domains.length} domain(s): ${findings.domains.slice(0, 3).join(", ")}${findings.domains.length > 3 ? "..." : ""}`
    );
  }

  if (riskScore >= 7) {
    insights.push(
      "🔴 HIGH RISK: Significant information exposure. Review recommended."
    );
  } else if (riskScore >= 4) {
    insights.push(
      "🟡 MEDIUM RISK: Moderate exposure. Consider privacy measures."
    );
  } else {
    insights.push(
      "🟢 LOW RISK: Limited exposure. Maintain current posture."
    );
  }

  return insights;
}