import { BaseAgent } from "./base-agents";
import { Task, AgentResult } from "./types";
import { db } from "@/lib/db";
import { entities, relationships, networkMetrics } from "@/lib/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import {
  extractEntities,
  extractRelationships,
  extractEmploymentHistory,
  extractEducation,
  analyzeProfileForRelationships,
} from "./tools/entity-extractor";

export interface DiscoveredRelationship {
  targetEntity: {
    name: string;
    type: "person" | "organization";
  };
  relationshipType: string;
  strength: number;
  context: string;
  evidence: {
    sources: string[];
    mentions: number;
    sharedPlatforms?: string[];
  };
}

export interface NetworkAnalysis {
  totalConnections: number;
  strongConnections: number;
  weakConnections: number;
  influenceScore: number;
  topConnections: Array<{
    name: string;
    strength: number;
    type: string;
  }>;
}

export class RelationshipAgent extends BaseAgent {
  async execute(task: Task): Promise<AgentResult> {
    console.log(`\n🕸️ ============================================`);
    console.log(`🕸️ RELATIONSHIP AGENT: Starting Task`);
    console.log(`🕸️ Entity ID: ${task.entityId}`);
    console.log(`🕸️ ============================================\n`);

    try {
      // Get the entity
      const entity = await this.getEntity(task.entityId);

      if (!entity) {
        throw new Error(`Entity ${task.entityId} not found`);
      }

      console.log(`👤 Analyzing: ${entity.name}`);

      // Analyze OSINT data for relationships
      const relationships = await this.discoverRelationships(entity);
      console.log(`✅ Discovered ${relationships.length} potential relationships`);

      // Store relationships in database
      await this.storeRelationships(entity.id, relationships);
      console.log(`💾 Stored relationships in database`);

      // Calculate network metrics
      const networkAnalysis = await this.calculateNetworkMetrics(entity.id);
      console.log(`📊 Network metrics calculated`);

      // Build graph data
      const graphData = await this.buildGraphData(entity.id);
      console.log(`🗺️ Graph data generated`);

      console.log(`\n✅ RELATIONSHIP AGENT: Task Complete\n`);

      return {
        agentName: this.name,
        success: true,
        data: {
          relationships,
          networkAnalysis,
          graphData,
        },
        confidence: this.calculateConfidence(relationships),
      };
    } catch (error: any) {
      console.error(`\n❌ RELATIONSHIP AGENT: Task Failed`, error.message);
      return {
        agentName: this.name,
        success: false,
        error: error.message,
      };
    }
  }

  private async getEntity(entityId: string) {
    const result = await db
      .select()
      .from(entities)
      .where(eq(entities.id, parseInt(entityId)))
      .limit(1);

    return result[0] || null;
  }

  private async discoverRelationships(
    entity: any
  ): Promise<DiscoveredRelationship[]> {
    const discovered: DiscoveredRelationship[] = [];

    // Get OSINT data
    const osintData = entity.osintData;

    if (!osintData?.findings?.profiles) {
      console.log(`⚠️ No OSINT data found for entity`);
      return discovered;
    }

    const profiles = osintData.findings.profiles;
    console.log(`📋 Analyzing ${profiles.length} profiles...`);

    // Analyze each profile
    for (const profile of profiles) {
      console.log(`  🔍 Analyzing ${profile.platform}...`);

      // Simulate bio/description (in real implementation, you'd scrape this)
      const mockBio = this.getMockProfileData(entity.name, profile.platform);

      const analysis = analyzeProfileForRelationships({
        platform: profile.platform,
        bio: mockBio.bio,
        posts: mockBio.posts,
      });

      // Process employment relationships
      analysis.employment.forEach((emp) => {
        discovered.push({
          targetEntity: {
            name: emp.company,
            type: "organization",
          },
          relationshipType: "employment",
          strength: 85,
          context: emp.role
            ? `${emp.role} at ${emp.company}`
            : `Works at ${emp.company}`,
          evidence: {
            sources: [profile.platform],
            mentions: 1,
          },
        });
      });

      // Process education relationships
      analysis.education.forEach((edu) => {
        discovered.push({
          targetEntity: {
            name: edu.institution,
            type: "organization",
          },
          relationshipType: "education",
          strength: 80,
          context: edu.degree
            ? `${edu.degree} from ${edu.institution}`
            : `Studied at ${edu.institution}`,
          evidence: {
            sources: [profile.platform],
            mentions: 1,
          },
        });
      });

      // Process entity mentions
      analysis.entities.forEach((ent) => {
        if (ent.name.toLowerCase() !== entity.name.toLowerCase()) {
          discovered.push({
            targetEntity: {
              name: ent.name,
              type: ent.type === "organization" ? "organization" : "person",
            },
            relationshipType: "associate",
            strength: Math.min(ent.confidence, 70),
            context: ent.context,
            evidence: {
              sources: [profile.platform],
              mentions: ent.mentions,
            },
          });
        }
      });
    }

    // Deduplicate and merge relationships
    const merged = this.mergeRelationships(discovered);

    return merged;
  }

  private getMockProfileData(
    entityName: string,
    platform: string
  ): { bio: string; posts: string[] } {
    // In production, you'd scrape actual profile data
    // For now, return mock data for demonstration
    
    const mockData: Record<string, any> = {
      GitHub: {
        bio: `Software Engineer passionate about open source. Working on interesting projects.`,
        posts: [
          "Just pushed a new feature to the main repo",
          "Thanks to @john_doe for the collaboration",
        ],
      },
      LinkedIn: {
        bio: `Senior Software Engineer at Tech Corp. Previously at StartupXYZ. Computer Science degree from State University. Passionate about AI and cloud computing.`,
        posts: [
          "Excited to announce my new role at Tech Corp!",
          "Great working with the team at StartupXYZ",
        ],
      },
      Twitter: {
        bio: `Tech enthusiast | Software Developer | Coffee lover`,
        posts: [
          "Love working with @jane_smith on this project",
          "Attending the Tech Conference next week",
        ],
      },
    };

    return (
      mockData[platform] || {
        bio: `${entityName}'s profile on ${platform}`,
        posts: [],
      }
    );
  }

  private mergeRelationships(
    relationships: DiscoveredRelationship[]
  ): DiscoveredRelationship[] {
    const merged = new Map<string, DiscoveredRelationship>();

    relationships.forEach((rel) => {
      const key = `${rel.targetEntity.name}:${rel.relationshipType}`;

      if (merged.has(key)) {
        const existing = merged.get(key)!;
        // Merge evidence
        existing.evidence.sources = [
          ...new Set([
            ...existing.evidence.sources,
            ...rel.evidence.sources,
          ]),
        ];
        existing.evidence.mentions += rel.evidence.mentions;
        // Increase strength
        existing.strength = Math.min(100, existing.strength + 10);
      } else {
        merged.set(key, rel);
      }
    });

    return Array.from(merged.values());
  }

  private async storeRelationships(
    sourceEntityId: number,
    discoveredRelationships: DiscoveredRelationship[]
  ) {
    console.log(`💾 Storing ${discoveredRelationships.length} relationships...`);

    for (const rel of discoveredRelationships) {
      // Check if target entity exists, create if not
      let targetEntity = await db
        .select()
        .from(entities)
        .where(eq(entities.name, rel.targetEntity.name))
        .limit(1);

      if (targetEntity.length === 0) {
        console.log(`  ✨ Creating new entity: ${rel.targetEntity.name}`);
        const newEntity = await db
          .insert(entities)
          .values({
            name: rel.targetEntity.name,
            type: rel.targetEntity.type,
            userId: null, // System-created
            metadata: {
              discoveredBy: "relationship-agent",
              source: "automatic",
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        targetEntity = newEntity;
      }

      // Check if relationship already exists
      const existing = await db
        .select()
        .from(relationships)
        .where(
          and(
            eq(relationships.sourceEntityId, sourceEntityId),
            eq(relationships.targetEntityId, targetEntity[0].id),
            eq(relationships.type, rel.relationshipType)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing relationship
        await db
          .update(relationships)
          .set({
            strength: rel.strength,
            context: rel.context,
            evidence: {
              ...rel.evidence,
              sharedPlatforms: rel.evidence.sharedPlatforms || [],
            },
            lastVerified: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(relationships.id, existing[0].id));

        console.log(`  ⬆️ Updated: ${rel.targetEntity.name} (${rel.relationshipType})`);
      } else {
        // Create new relationship
        await db.insert(relationships).values({
          sourceEntityId,
          targetEntityId: targetEntity[0].id,
          type: rel.relationshipType,
          strength: rel.strength,
          context: rel.context,
          evidence: {
            ...rel.evidence,
            sharedPlatforms: rel.evidence.sharedPlatforms || [],
          },
          discoveredAt: new Date(),
          lastVerified: new Date(),
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`  ✅ Created: ${rel.targetEntity.name} (${rel.relationshipType})`);
      }
    }
  }

  private async calculateNetworkMetrics(
    entityId: number
  ): Promise<NetworkAnalysis> {
    console.log(`📊 Calculating network metrics...`);

    // Get all relationships
    const outgoing = await db
      .select()
      .from(relationships)
      .where(eq(relationships.sourceEntityId, entityId));

    const incoming = await db
      .select()
      .from(relationships)
      .where(eq(relationships.targetEntityId, entityId));

    const allRelationships = [...outgoing, ...incoming];

    const totalConnections = allRelationships.length;
    const strongConnections = allRelationships.filter((r) => r.strength >= 70).length;
    const weakConnections = allRelationships.filter((r) => r.strength < 40).length;

    // Calculate influence score
    const influenceScore = Math.min(
      100,
      Math.round(
        strongConnections * 10 + totalConnections * 2 + incoming.length * 5
      )
    );

    // Get top connections
    const sortedRelationships = allRelationships
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10);

    const topConnections = await Promise.all(
      sortedRelationships.map(async (rel) => {
        const targetId =
          rel.sourceEntityId === entityId
            ? rel.targetEntityId
            : rel.sourceEntityId;

        const target = await db
          .select()
          .from(entities)
          .where(eq(entities.id, targetId))
          .limit(1);

        return {
          name: target[0]?.name || "Unknown",
          strength: rel.strength,
          type: rel.type,
        };
      })
    );

    // Store metrics
    const existingMetrics = await db
      .select()
      .from(networkMetrics)
      .where(eq(networkMetrics.entityId, entityId))
      .limit(1);

    if (existingMetrics.length > 0) {
      await db
        .update(networkMetrics)
        .set({
          totalConnections,
          strongConnections,
          weakConnections,
          influenceScore,
          calculatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(networkMetrics.id, existingMetrics[0].id));
    } else {
      await db.insert(networkMetrics).values({
        entityId,
        totalConnections,
        strongConnections,
        weakConnections,
        influenceScore,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return {
      totalConnections,
      strongConnections,
      weakConnections,
      influenceScore,
      topConnections,
    };
  }

  private async buildGraphData(entityId: number) {
    console.log(`🗺️ Building graph data...`);

    // Get entity
    const entityResult = await db
      .select()
      .from(entities)
      .where(eq(entities.id, entityId))
      .limit(1);

    const entity = entityResult[0];

    // Get relationships
    const outgoing = await db
      .select()
      .from(relationships)
      .where(eq(relationships.sourceEntityId, entityId));

    const incoming = await db
      .select()
      .from(relationships)
      .where(eq(relationships.targetEntityId, entityId));

    // Build nodes
    const nodes = [
      {
        id: `entity-${entityId}`,
        label: entity.name,
        type: entity.type,
        size: 30,
        color: "#00ff88",
      },
    ];

    const edges: any[] = [];
    const connectedEntityIds = new Set<number>();

    // Process outgoing relationships
    for (const rel of outgoing) {
      connectedEntityIds.add(rel.targetEntityId);

      const target = await db
        .select()
        .from(entities)
        .where(eq(entities.id, rel.targetEntityId))
        .limit(1);

      if (target[0]) {
        nodes.push({
          id: `entity-${rel.targetEntityId}`,
          label: target[0].name,
          type: target[0].type,
          size: 20,
          color: target[0].type === "person" ? "#4488ff" : "#ff8844",
        });

        edges.push({
          id: `rel-${rel.id}`,
          source: `entity-${entityId}`,
          target: `entity-${rel.targetEntityId}`,
          label: rel.type,
          strength: rel.strength,
          color: rel.strength >= 70 ? "#00ff88" : "#888888",
        });
      }
    }

    // Process incoming relationships
    for (const rel of incoming) {
      if (connectedEntityIds.has(rel.sourceEntityId)) continue;

      const source = await db
        .select()
        .from(entities)
        .where(eq(entities.id, rel.sourceEntityId))
        .limit(1);

      if (source[0]) {
        nodes.push({
          id: `entity-${rel.sourceEntityId}`,
          label: source[0].name,
          type: source[0].type,
          size: 20,
          color: source[0].type === "person" ? "#4488ff" : "#ff8844",
        });

        edges.push({
          id: `rel-${rel.id}`,
          source: `entity-${rel.sourceEntityId}`,
          target: `entity-${entityId}`,
          label: rel.type,
          strength: rel.strength,
          color: rel.strength >= 70 ? "#00ff88" : "#888888",
        });
      }
    }

    return { nodes, edges };
  }

  private calculateConfidence(relationships: DiscoveredRelationship[]): number {
    if (relationships.length === 0) return 0;

    const avgStrength =
      relationships.reduce((sum, r) => sum + r.strength, 0) /
      relationships.length;

    return Math.round(avgStrength);
  }
}