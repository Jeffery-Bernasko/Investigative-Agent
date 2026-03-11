import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entities, reports, trackingLinks, osintSearches } from "@/lib/db/schema";
import { sql, desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    // Simple connection test first
    await db.execute(sql`SELECT 1 as test`);

    // Get entity stats
    const entityCount = await db
      .select({ count: sql`count(*)` })
      .from(entities);

    const recentEntities = await db
      .select()
      .from(entities)
      .orderBy(desc(entities.createdAt))
      .limit(5);

    const highRiskEntities = await db
      .select({ count: sql`count(*)` })
      .from(entities)
      .where(sql`${entities.threatScore} >= 70`);

    const criticalEntities = await db
      .select({ count: sql`count(*)` })
      .from(entities)
      .where(sql`${entities.threatScore} >= 90`);

    // Get report stats
    const reportCount = await db
      .select({ count: sql`count(*)` })
      .from(reports);

    const recentReports = await db
      .select()
      .from(reports)
      .orderBy(desc(reports.createdAt))
      .limit(5);

    // Get tracking stats
    const trackingStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_links,
        COALESCE(SUM(click_count), 0) as total_clicks,
        COUNT(*) FILTER (WHERE status = 'active') as active_links
      FROM tracking_links
    `);

    // Get OSINT search stats
    const osintStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_searches,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_searches,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as today_searches
      FROM osint_searches
    `);

    // Get entity type distribution
    const entityTypeDistribution = await db.execute(sql`
      SELECT 
        type,
        COUNT(*) as count,
        COALESCE(AVG(threat_score), 0) as avg_threat_score
      FROM entities
      GROUP BY type
      ORDER BY count DESC
    `);

    // Get threat level distribution
    const threatLevelDistribution = await db.execute(sql`
      SELECT 
        threat_level,
        COUNT(*) as count
      FROM entities
      WHERE threat_level IS NOT NULL
      GROUP BY threat_level
    `);

    // Generate monthly data for charts
    const monthlyData = await db.execute(sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM entities
      WHERE created_at > NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);

    const tracking = trackingStats.rows[0] || {};
    const osint = osintStats.rows[0] || {};

    return NextResponse.json({
      entities: {
        total: Number(entityCount[0]?.count || 0),
        highRisk: Number(highRiskEntities[0]?.count || 0),
        critical: Number(criticalEntities[0]?.count || 0),
        recent: recentEntities,
        byType: entityTypeDistribution.rows,
        byThreatLevel: threatLevelDistribution.rows,
      },
      reports: {
        total: Number(reportCount[0]?.count || 0),
        recent: recentReports,
      },
      tracking: {
        totalLinks: Number(tracking.total_links || 0),
        totalClicks: Number(tracking.total_clicks || 0),
        activeLinks: Number(tracking.active_links || 0),
      },
      osint: {
        totalSearches: Number(osint.total_searches || 0),
        completedSearches: Number(osint.completed_searches || 0),
        todaySearches: Number(osint.today_searches || 0),
      },
      charts: {
        monthly: monthlyData.rows,
      },
      systemHealth: {
        database: "connected",
        api: "operational",
        ai: "requires_configuration",
      },
    });
  } catch (error) {
    console.error("Failed to get dashboard stats:", error);
    
    // Return empty stats if database is not connected
    return NextResponse.json({
      entities: {
        total: 0,
        highRisk: 0,
        critical: 0,
        recent: [],
        byType: [],
        byThreatLevel: [],
      },
      reports: {
        total: 0,
        recent: [],
      },
      tracking: {
        totalLinks: 0,
        totalClicks: 0,
        activeLinks: 0,
      },
      osint: {
        totalSearches: 0,
        completedSearches: 0,
        todaySearches: 0,
      },
      charts: {
        monthly: [],
      },
      systemHealth: {
        database: "disconnected",
        api: "operational",
        ai: "unknown",
      },
      error: "Database connection failed. Please check your DATABASE_URL.",
    });
  }
}


