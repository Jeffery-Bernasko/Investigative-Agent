import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entities, entityRelations, vectors, NewEntity } from "@/lib/db/schema";
import { eq, ilike, or, desc, asc, sql, and, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const userId = searchParams.get("userId");
    const threatLevel = searchParams.get("threatLevel");
    const minThreatScore = searchParams.get("minThreatScore");

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(entities.name, `%${search}%`),
          ilike(entities.description, `%${search}%`),
          ilike(entities.email, `%${search}%`),
          ilike(entities.username, `%${search}%`),
          ilike(entities.phone, `%${search}%`)
        )
      );
    }

    if (type && type !== "all") {
      conditions.push(eq(entities.type, type as typeof entities.type.enumValues[number]));
    }

    if (userId) {
      conditions.push(eq(entities.userId, userId));
    }

    if (threatLevel && threatLevel !== "all") {
      conditions.push(eq(entities.threatLevel, threatLevel as typeof entities.threatLevel.enumValues[number]));
    }

    if (minThreatScore) {
      conditions.push(sql`${entities.threatScore} >= ${parseInt(minThreatScore)}`);
    }

    // Execute query
    const query = db
      .select()
      .from(entities)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Apply sorting
    const sortColumn = {
      name: entities.name,
      createdAt: entities.createdAt,
      updatedAt: entities.updatedAt,
      threatScore: entities.threatScore,
    }[sortBy] || entities.createdAt;

    const orderedQuery = sortOrder === "asc" 
      ? query.orderBy(asc(sortColumn))
      : query.orderBy(desc(sortColumn));

    const results = await orderedQuery.limit(limit).offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(entities)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      entities: results,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + results.length < total,
      },
    });
  } catch (error) {
    console.error("Failed to get entities:", error);
    return NextResponse.json(
      { error: "Failed to fetch entities" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    // Prepare entity data
    const entityData: NewEntity = {
      name: body.name,
      type: body.type,
      description: body.description || null,
      threatLevel: body.threatLevel || "unknown",
      threatScore: body.threatScore || 0,
      email: body.email || null,
      phone: body.phone || null,
      username: body.username || null,
      socialProfiles: body.socialProfiles || null,
      location: body.location || null,
      metadata: body.metadata || null,
      osintData: body.osintData || null,
      imageUrl: body.imageUrl || null,
      tags: body.tags || null,
      userId: body.userId || null,
    };

    // Insert entity
    const [newEntity] = await db
      .insert(entities)
      .values(entityData)
      .returning();

    // Create relationships if provided
    if (body.relationships && Array.isArray(body.relationships)) {
      const relationshipData = body.relationships.map((rel: { targetEntityId: number; relationType: string; strength?: number }) => ({
        sourceEntityId: newEntity.id,
        targetEntityId: rel.targetEntityId,
        relationType: rel.relationType,
        strength: rel.strength || 50,
      }));

      if (relationshipData.length > 0) {
        await db.insert(entityRelations).values(relationshipData);
      }
    }

    return NextResponse.json({
      success: true,
      entity: newEntity,
    });
  } catch (error) {
    console.error("Failed to create entity:", error);
    return NextResponse.json(
      { error: "Failed to create entity" },
      { status: 500 }
    );
  }
}

// Bulk operations
export async function PUT(request: NextRequest) {
  try {
    const { action, entityIds, data } = await request.json();

    if (!action || !entityIds || !Array.isArray(entityIds)) {
      return NextResponse.json(
        { error: "Action and entityIds are required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "updateThreatLevel": {
        if (!data?.threatLevel) {
          return NextResponse.json(
            { error: "threatLevel is required" },
            { status: 400 }
          );
        }

        await db
          .update(entities)
          .set({
            threatLevel: data.threatLevel,
            updatedAt: new Date(),
          })
          .where(inArray(entities.id, entityIds));

        return NextResponse.json({ success: true, updated: entityIds.length });
      }

      case "updateThreatScore": {
        if (data?.threatScore === undefined) {
          return NextResponse.json(
            { error: "threatScore is required" },
            { status: 400 }
          );
        }

        await db
          .update(entities)
          .set({
            threatScore: data.threatScore,
            updatedAt: new Date(),
          })
          .where(inArray(entities.id, entityIds));

        return NextResponse.json({ success: true, updated: entityIds.length });
      }

      case "addTags": {
        if (!data?.tags || !Array.isArray(data.tags)) {
          return NextResponse.json(
            { error: "tags array is required" },
            { status: 400 }
          );
        }

        // Get current tags and merge
        const currentEntities = await db
          .select()
          .from(entities)
          .where(inArray(entities.id, entityIds));

        for (const entity of currentEntities) {
          const currentTags = entity.tags || [];
          const mergedTags = [...currentTags, ...data.tags];
          const newTags = Array.from(new Set(mergedTags));

          await db
            .update(entities)
            .set({ tags: newTags, updatedAt: new Date() })
            .where(eq(entities.id, entity.id));
        }

        return NextResponse.json({ success: true, updated: entityIds.length });
      }

      case "delete": {
        await db.delete(entities).where(inArray(entities.id, entityIds));
        return NextResponse.json({ success: true, deleted: entityIds.length });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Bulk operation failed:", error);
    return NextResponse.json(
      { error: "Bulk operation failed" },
      { status: 500 }
    );
  }
}

// Get entity stats
export async function OPTIONS() {
  try {
    const stats = await db.execute(sql`
      SELECT 
        type,
        COUNT(*) as count,
        AVG(threat_score) as avg_threat_score,
        MAX(threat_score) as max_threat_score
      FROM entities
      GROUP BY type
    `);

    const totalCount = await db
      .select({ count: sql`count(*)` })
      .from(entities);

    const recentCount = await db
      .select({ count: sql`count(*)` })
      .from(entities)
      .where(sql`created_at > NOW() - INTERVAL '7 days'`);

    const highRiskCount = await db
      .select({ count: sql`count(*)` })
      .from(entities)
      .where(sql`threat_score >= 70`);

    return NextResponse.json({
      byType: stats.rows,
      total: Number(totalCount[0]?.count || 0),
      recentlyAdded: Number(recentCount[0]?.count || 0),
      highRisk: Number(highRiskCount[0]?.count || 0),
    });
  } catch (error) {
    console.error("Failed to get stats:", error);
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
