import { db } from "@/lib/db";
import { relationships, entityRelations } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";

export interface CanonicalRelationship {
  id: number;
  sourceEntityId: number;
  targetEntityId: number;
  type: string;
  strength: number;
  context: string | null;
  evidence: { sources: string[]; mentions: number; sharedPlatforms: string[] } | null;
  status: string | null;
  discoveredAt: Date | null;
  lastVerified: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  direction?: "outgoing" | "incoming";
  relatedEntity?: any;
}

/**
 * Map a legacy entityRelation row to canonical shape.
 * Used when merging legacy reads into the canonical response.
 */
export function adaptLegacyRelation(
  rel: typeof entityRelations.$inferSelect,
): CanonicalRelationship {
  return {
    id: rel.id,
    sourceEntityId: rel.sourceEntityId,
    targetEntityId: rel.targetEntityId,
    type: rel.relationType,
    strength: rel.strength ?? 50,
    context: null,
    evidence: null,
    status: "active",
    discoveredAt: rel.createdAt,
    lastVerified: null,
    createdAt: rel.createdAt,
    updatedAt: rel.createdAt,
  };
}

/**
 * Upsert a relationship in the canonical `relationships` table.
 * If a row with matching (sourceEntityId, targetEntityId, type) already exists, skip it.
 */
export async function upsertCanonicalRelationship(rel: {
  sourceEntityId: number;
  targetEntityId: number;
  type: string;
  strength?: number;
  context?: string | null;
  evidence?: { sources: string[]; mentions: number; sharedPlatforms: string[] } | null;
}): Promise<void> {
  const existing = await db
    .select({ id: relationships.id })
    .from(relationships)
    .where(
      and(
        eq(relationships.sourceEntityId, rel.sourceEntityId),
        eq(relationships.targetEntityId, rel.targetEntityId),
        eq(relationships.type, rel.type),
      ),
    )
    .limit(1);

  if (existing.length > 0) return; // skip — canonical data wins

  await db.insert(relationships).values({
    sourceEntityId: rel.sourceEntityId,
    targetEntityId: rel.targetEntityId,
    type: rel.type,
    strength: rel.strength ?? 50,
    context: rel.context ?? null,
    evidence: rel.evidence ?? { sources: [], mentions: 1, sharedPlatforms: [] },
    status: "active",
    discoveredAt: new Date(),
    lastVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Find all canonical relationships for an entity (both directions).
 */
export async function findCanonicalByEntity(entityId: number) {
  return db
    .select()
    .from(relationships)
    .where(
      or(
        eq(relationships.sourceEntityId, entityId),
        eq(relationships.targetEntityId, entityId),
      ),
    );
}

/**
 * Delete all canonical relationships where this entity is source or target.
 */
export async function deleteCanonicalByEntity(entityId: number): Promise<void> {
  await db
    .delete(relationships)
    .where(
      or(
        eq(relationships.sourceEntityId, entityId),
        eq(relationships.targetEntityId, entityId),
      ),
    );
}

/**
 * Delete canonical relationships where this entity is the source only.
 * Used when replacing outgoing relationships on PUT.
 */
export async function deleteCanonicalBySource(entityId: number): Promise<void> {
  await db
    .delete(relationships)
    .where(eq(relationships.sourceEntityId, entityId));
}
