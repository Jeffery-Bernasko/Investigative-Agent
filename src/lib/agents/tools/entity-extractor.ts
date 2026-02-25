export interface ExtractedEntity {
  name: string;
  type: "person" | "organization" | "location";
  confidence: number;
  context: string;
  mentions: number;
}

export interface ExtractedRelationship {
  entity1: string;
  entity2: string;
  type: string;
  context: string;
  confidence: number;
}

// Common relationship keywords
const RELATIONSHIP_PATTERNS = {
  employment: [
    "works at",
    "employed by",
    "engineer at",
    "manager at",
    "ceo of",
    "founder of",
    "developer at",
    "works for",
  ],
  education: [
    "studied at",
    "graduated from",
    "alumni of",
    "degree from",
    "university",
    "college",
  ],
  family: [
    "husband",
    "wife",
    "brother",
    "sister",
    "father",
    "mother",
    "son",
    "daughter",
    "parent",
    "child",
  ],
  colleague: [
    "colleague",
    "coworker",
    "team member",
    "collaborator",
    "partner",
  ],
  friend: ["friend", "knows", "connected with", "follows"],
};

// Known organizations (you can expand this)
const KNOWN_ORGANIZATIONS = [
  "google",
  "microsoft",
  "apple",
  "amazon",
  "meta",
  "facebook",
  "twitter",
  "tesla",
  "spacex",
  "github",
  "linkedin",
];

/**
 * Extract named entities from text
 */
export function extractEntities(text: string): ExtractedEntity[] {
  if (!text) return [];

  const entities: Map<string, ExtractedEntity> = new Map();
  const lowerText = text.toLowerCase();

  // Extract capitalized words (likely names)
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
  const matches = text.match(capitalizedPattern) || [];

  matches.forEach((match) => {
    const name = match.trim();
    const lowerName = name.toLowerCase();

    // Skip common words
    if (
      lowerName.includes("the ") ||
      lowerName.includes("a ") ||
      lowerName.length < 3
    ) {
      return;
    }

    // Determine type
    let type: "person" | "organization" | "location" = "person";
    if (
      KNOWN_ORGANIZATIONS.some((org) => lowerName.includes(org)) ||
      lowerName.includes("inc") ||
      lowerName.includes("corp") ||
      lowerName.includes("llc") ||
      lowerName.includes("ltd")
    ) {
      type = "organization";
    }

    // Count mentions
    const mentions = (text.match(new RegExp(name, "gi")) || []).length;

    // Get context (surrounding text)
    const index = text.indexOf(name);
    const contextStart = Math.max(0, index - 50);
    const contextEnd = Math.min(text.length, index + name.length + 50);
    const context = text.substring(contextStart, contextEnd).trim();

    // Calculate confidence
    const confidence = Math.min(100, 50 + mentions * 10);

    if (entities.has(name)) {
      const existing = entities.get(name)!;
      existing.mentions += mentions;
      existing.confidence = Math.min(100, existing.confidence + 10);
    } else {
      entities.set(name, {
        name,
        type,
        confidence,
        context,
        mentions,
      });
    }
  });

  // Extract @mentions (social media handles)
  const mentionPattern = /@([a-zA-Z0-9_]+)/g;
  const socialMentions = text.match(mentionPattern) || [];

  socialMentions.forEach((mention) => {
    const name = mention.substring(1); // Remove @
    const mentions = (text.match(new RegExp(`@${name}`, "gi")) || []).length;

    entities.set(mention, {
      name,
      type: "person",
      confidence: 70,
      context: `Social media mention: ${mention}`,
      mentions,
    });
  });

  return Array.from(entities.values());
}

/**
 * Extract relationships from text
 */
export function extractRelationships(
  text: string,
  sourceEntity: string
): ExtractedRelationship[] {
  if (!text) return [];

  const relationships: ExtractedRelationship[] = [];
  const lowerText = text.toLowerCase();

  // Extract entities first
  const entities = extractEntities(text);

  // Check for relationship patterns
  Object.entries(RELATIONSHIP_PATTERNS).forEach(([relType, patterns]) => {
    patterns.forEach((pattern) => {
      if (lowerText.includes(pattern)) {
        // Find entities near this pattern
        const patternIndex = lowerText.indexOf(pattern);
        const contextStart = Math.max(0, patternIndex - 100);
        const contextEnd = Math.min(text.length, patternIndex + pattern.length + 100);
        const context = text.substring(contextStart, contextEnd);

        // Find entities in context
        entities.forEach((entity) => {
          if (context.toLowerCase().includes(entity.name.toLowerCase())) {
            relationships.push({
              entity1: sourceEntity,
              entity2: entity.name,
              type: relType,
              context: `${pattern} ${entity.name}`,
              confidence: entity.confidence,
            });
          }
        });
      }
    });
  });

  return relationships;
}

// Extract employment history
export function extractEmploymentHistory(
  bio: string
): Array<{ company: string; role?: string; period?: string }> {
  const employment: Array<{ company: string; role?: string; period?: string }> = [];

  // Pattern: "Software Engineer at Google (2020-2023)"
  const pattern1 = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
  let match: any[] | null;

  while ((match = pattern1.exec(bio)) !== null) {
    employment.push({
      company: match[2],
      role: match[1],
    });
  }

  // Pattern: "Currently working at Tesla"
  const pattern2 = /(?:working|employed)\s+at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
  while ((match = pattern2.exec(bio)) !== null) {
    const currentMatch = match;
    if (!employment.find((e) => e.company === currentMatch[1])) {
      employment.push({
        company: currentMatch[1],
      });
    }
  }

  return employment;
}

/**
 * Extract education history
 */
export function extractEducation(
  bio: string
): Array<{ institution: string; degree?: string; year?: string }> {
  const education: Array<{ institution: string; degree?: string; year?: string }> = [];

  // Pattern: "BS in Computer Science from MIT"
  const pattern1 = /([A-Z]{2,})\s+(?:in|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
  let match: any[] | null;

  while ((match = pattern1.exec(bio)) !== null) {
    education.push({
      degree: match[1],
      institution: match[2],
    });
  }

  // Pattern: "Graduated from Stanford"
  const pattern2 = /graduated\s+from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
  while ((match = pattern2.exec(bio)) !== null) {
    const currentMatch = match;
    if (!education.find((e) => e.institution === currentMatch[1])) {
      education.push({
        institution: currentMatch[1],
      });
    }
  }

  return education;
}

/**
 * Main function: Extract all entities and relationships from profile data
 */
export function analyzeProfileForRelationships(profile: {
  platform: string;
  bio?: string;
  description?: string;
  posts?: string[];
  followers?: string[];
  following?: string[];
}): {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  employment: Array<{ company: string; role?: string }>;
  education: Array<{ institution: string; degree?: string }>;
} {
  // Combine all text
  const allText = [
    profile.bio || "",
    profile.description || "",
    ...(profile.posts || []),
  ].join(" ");

  // Extract entities
  const entities = extractEntities(allText);

  // Extract relationships
  const relationships = extractRelationships(allText, profile.platform);

  // Extract employment
  const employment = extractEmploymentHistory(allText);

  // Extract education
  const education = extractEducation(allText);

  return {
    entities,
    relationships,
    employment,
    education,
  };
}