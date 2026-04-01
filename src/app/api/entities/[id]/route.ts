import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entities, entityRelations, vectors } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import {
  findCanonicalByEntity,
  adaptLegacyRelation,
  upsertCanonicalRelationship,
  deleteCanonicalByEntity,
  deleteCanonicalBySource,
} from "@/lib/agents/tools/relationship-repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entityId = parseInt(id);

    if (isNaN(entityId)) {
      return NextResponse.json(
        { error: "Invalid entity ID" },
        { status: 400 }
      );
    }

    // Get entity
    const [entity] = await db
      .select()
      .from(entities)
      .where(eq(entities.id, entityId))
      .limit(1);

    if (!entity) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      );
    }

    // Read from canonical relationships table
    const canonicalRels = await findCanonicalByEntity(entityId);

    // Also read legacy rows and merge any not already in canonical (adapter mapping)
    const legacyRels = await db
      .select()
      .from(entityRelations)
      .where(
        or(
          eq(entityRelations.sourceEntityId, entityId),
          eq(entityRelations.targetEntityId, entityId),
        ),
      );

    // Build a set of (source, target, type) already covered by canonical
    const canonicalKeys = new Set(
      canonicalRels.map((r) => `${r.sourceEntityId}:${r.targetEntityId}:${r.type}`),
    );

    const adaptedLegacy = legacyRels
      .map(adaptLegacyRelation)
      .filter(
        (r) => !canonicalKeys.has(`${r.sourceEntityId}:${r.targetEntityId}:${r.type}`),
      );

    const allRels = [...canonicalRels, ...adaptedLegacy];

    // Collect related entity IDs
    const relatedEntityIds = Array.from(
      new Set(
        allRels
          .flatMap((r) => [r.sourceEntityId, r.targetEntityId])
          .filter((id) => id !== entityId),
      ),
    );

    let relatedEntities: typeof entity[] = [];
    if (relatedEntityIds.length > 0) {
      relatedEntities = await db
        .select()
        .from(entities)
        .where(or(...relatedEntityIds.map((id) => eq(entities.id, id))));
    }

    return NextResponse.json({
      entity,
      relationships: allRels.map((r) => ({
        id: r.id,
        sourceEntityId: r.sourceEntityId,
        targetEntityId: r.targetEntityId,
        type: r.type,
        strength: r.strength,
        context: r.context,
        evidence: r.evidence,
        status: r.status,
        discoveredAt: r.discoveredAt,
        lastVerified: r.lastVerified,
        createdAt: r.createdAt,
        direction: r.sourceEntityId === entityId ? "outgoing" : "incoming",
        relatedEntity: relatedEntities.find(
          (e) => e.id === (r.sourceEntityId === entityId ? r.targetEntityId : r.sourceEntityId),
        ),
      })),
    });
  } catch (error) {
    console.error("Failed to get entity:", error);
    return NextResponse.json(
      { error: "Failed to fetch entity" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entityId = parseInt(id);
    const body = await request.json();

    if (isNaN(entityId)) {
      return NextResponse.json(
        { error: "Invalid entity ID" },
        { status: 400 }
      );
    }

    // Check if entity exists
    const [existing] = await db
      .select()
      .from(entities)
      .where(eq(entities.id, entityId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Only update provided fields
    const allowedFields = [
      "name",
      "type",
      "description",
      "threatLevel",
      "threatScore",
      "email",
      "phone",
      "username",
      "socialProfiles",
      "location",
      "metadata",
      "osintData",
      "imageUrl",
      "tags",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Update entity
    const [updatedEntity] = await db
      .update(entities)
      .set(updateData)
      .where(eq(entities.id, entityId))
      .returning();

    // Update relationships if provided
    if (body.relationships !== undefined && Array.isArray(body.relationships)) {
      // Delete existing outgoing from both stores
      await db.delete(entityRelations).where(eq(entityRelations.sourceEntityId, entityId));
      await deleteCanonicalBySource(entityId);

      // Insert new relationships into both stores
      if (body.relationships.length > 0) {
        const relationshipData = body.relationships.map(
          (rel: { targetEntityId: number; relationType: string; strength?: number }) => ({
            sourceEntityId: entityId,
            targetEntityId: rel.targetEntityId,
            relationType: rel.relationType,
            strength: rel.strength || 50,
          }),
        );

        await db.insert(entityRelations).values(relationshipData);
        for (const rel of relationshipData) {
          await upsertCanonicalRelationship({
            sourceEntityId: rel.sourceEntityId,
            targetEntityId: rel.targetEntityId,
            type: rel.relationType,
            strength: rel.strength,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      entity: updatedEntity,
    });
  } catch (error) {
    console.error("Failed to update entity:", error);
    return NextResponse.json(
      { error: "Failed to update entity" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entityId = parseInt(id);

    if (isNaN(entityId)) {
      return NextResponse.json(
        { error: "Invalid entity ID" },
        { status: 400 }
      );
    }

    // Check if entity exists
    const [existing] = await db
      .select()
      .from(entities)
      .where(eq(entities.id, entityId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      );
    }

    // Delete from both relationship stores
    await db
      .delete(entityRelations)
      .where(
        or(
          eq(entityRelations.sourceEntityId, entityId),
          eq(entityRelations.targetEntityId, entityId),
        ),
      );
    await deleteCanonicalByEntity(entityId);

    // Delete vectors
    await db.delete(vectors).where(eq(vectors.entityId, entityId));

    // Delete entity
    await db.delete(entities).where(eq(entities.id, entityId));

    return NextResponse.json({
      success: true,
      deleted: entityId,
    });
  } catch (error) {
    console.error("Failed to delete entity:", error);
    return NextResponse.json(
      { error: "Failed to delete entity" },
      { status: 500 }
    );
  }
}
