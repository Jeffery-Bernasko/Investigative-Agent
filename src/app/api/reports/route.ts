import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports, NewReport } from "@/lib/db/schema";
import { eq, ilike, or, desc, asc, sql, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const userId = searchParams.get("userId");
    const threatLevel = searchParams.get("threatLevel");

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(reports.title, `%${search}%`),
          ilike(reports.content, `%${search}%`),
          ilike(reports.summary, `%${search}%`)
        )
      );
    }

    if (status && status !== "all") {
      conditions.push(eq(reports.status, status as typeof reports.status.enumValues[number]));
    }

    if (userId) {
      conditions.push(eq(reports.userId, userId));
    }

    if (threatLevel && threatLevel !== "all") {
      conditions.push(eq(reports.threatLevel, threatLevel as typeof reports.threatLevel.enumValues[number]));
    }

    // Execute query
    const query = db
      .select()
      .from(reports)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Apply sorting
    const sortColumn = {
      title: reports.title,
      createdAt: reports.createdAt,
      updatedAt: reports.updatedAt,
      publishedAt: reports.publishedAt,
    }[sortBy] || reports.createdAt;

    const orderedQuery = sortOrder === "asc" 
      ? query.orderBy(asc(sortColumn))
      : query.orderBy(desc(sortColumn));

    const results = await orderedQuery.limit(limit).offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(reports)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      reports: results,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + results.length < total,
      },
    });
  } catch (error) {
    console.error("Failed to get reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Prepare report data
    const reportData: NewReport = {
      title: body.title,
      content: body.content,
      summary: body.summary || null,
      status: body.status || "draft",
      threatLevel: body.threatLevel || "unknown",
      source: body.source || null,
      sourceUrl: body.sourceUrl || null,
      entityIds: body.entityIds || null,
      tags: body.tags || null,
      aiInsights: body.aiInsights || null,
      userId: body.userId || null,
      publishedAt: body.status === "published" ? new Date() : null,
    };

    // Insert report
    const [newReport] = await db
      .insert(reports)
      .values(reportData)
      .returning();

    return NextResponse.json({
      success: true,
      report: newReport,
    });
  } catch (error) {
    console.error("Failed to create report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      );
    }

    // Check if report exists
    const [existing] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    // Prepare update
    const data: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    const allowedFields = [
      "title",
      "content",
      "summary",
      "status",
      "threatLevel",
      "source",
      "sourceUrl",
      "entityIds",
      "tags",
      "aiInsights",
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        data[field] = updateData[field];
      }
    }

    // Set publishedAt if status changed to published
    if (updateData.status === "published" && existing.status !== "published") {
      data.publishedAt = new Date();
    }

    // Update report
    const [updatedReport] = await db
      .update(reports)
      .set(data)
      .where(eq(reports.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      report: updatedReport,
    });
  } catch (error) {
    console.error("Failed to update report:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      );
    }

    await db.delete(reports).where(eq(reports.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete report:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}
