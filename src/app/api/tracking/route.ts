import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trackingLinks, trackingData, userSettings } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const links = await db
      .select()
      .from(trackingLinks)
      .where(userId ? eq(trackingLinks.userId, userId) : undefined)
      .orderBy(desc(trackingLinks.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(trackingLinks)
      .where(userId ? eq(trackingLinks.userId, userId) : undefined);

    // Get stats
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_links,
        SUM(click_count) as total_clicks,
        COUNT(*) FILTER (WHERE status = 'active') as active_links
      FROM tracking_links
      ${userId ? sql`WHERE user_id = ${userId}` : sql``}
    `);

    const stats = statsResult.rows[0] || {};

    return NextResponse.json({
      links,
      stats: {
        totalLinks: Number(stats.total_links || 0),
        totalClicks: Number(stats.total_clicks || 0),
        activeLinks: Number(stats.active_links || 0),
      },
      pagination: {
        total: Number(countResult[0]?.count || 0),
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Failed to get tracking links:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking links" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.destinationUrl) {
      return NextResponse.json(
        { error: "Destination URL is required" },
        { status: 400 }
      );
    }

    // Generate unique code
    const code = nanoid(8);

    // Calculate expiration (default 30 days)
    const expiresAt = body.expiresAt
      ? new Date(body.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [newLink] = await db
      .insert(trackingLinks)
      .values({
        code,
        name: body.name || `Link ${code}`,
        destinationUrl: body.destinationUrl,
        userId: body.userId || null,
        entityId: body.entityId || null,
        status: "active",
        expiresAt,
      })
      .returning();

    // Generate the tracking URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const trackingUrl = `${baseUrl}/t/${code}`;

    return NextResponse.json({
      success: true,
      link: newLink,
      trackingUrl,
    });
  } catch (error) {
    console.error("Failed to create tracking link:", error);
    return NextResponse.json(
      { error: "Failed to create tracking link" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { linkId, action, data } = await request.json();

    if (!linkId) {
      return NextResponse.json(
        { error: "Link ID is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "disable": {
        await db
          .update(trackingLinks)
          .set({ status: "disabled", updatedAt: new Date() })
          .where(eq(trackingLinks.id, linkId));
        return NextResponse.json({ success: true });
      }

      case "enable": {
        await db
          .update(trackingLinks)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(trackingLinks.id, linkId));
        return NextResponse.json({ success: true });
      }

      case "update": {
        if (!data) {
          return NextResponse.json(
            { error: "Data is required for update" },
            { status: 400 }
          );
        }

        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (data.name) updateData.name = data.name;
        if (data.destinationUrl) updateData.destinationUrl = data.destinationUrl;
        if (data.expiresAt) updateData.expiresAt = new Date(data.expiresAt);

        await db
          .update(trackingLinks)
          .set(updateData)
          .where(eq(trackingLinks.id, linkId));

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Failed to update tracking link:", error);
    return NextResponse.json(
      { error: "Failed to update tracking link" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("id");

    if (!linkId) {
      return NextResponse.json(
        { error: "Link ID is required" },
        { status: 400 }
      );
    }

    // Delete tracking data first
    await db.delete(trackingData).where(eq(trackingData.trackingLinkId, parseInt(linkId)));

    // Delete link
    await db.delete(trackingLinks).where(eq(trackingLinks.id, parseInt(linkId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete tracking link:", error);
    return NextResponse.json(
      { error: "Failed to delete tracking link" },
      { status: 500 }
    );
  }
}
