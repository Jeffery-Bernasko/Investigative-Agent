import { pgTable, text, timestamp, serial, pgEnum, uniqueIndex, jsonb, boolean, integer, real, index } from 'drizzle-orm/pg-core';
import { customType } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Custom Types
// Define the vector type for pgvector (1536 dimensions for OpenAI embeddings)
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value.replace(/^\[/, '[').replace(/\]$/, ']'));
  },
});

// Enums
export const entityTypeEnum = pgEnum('entity_type', [
  'person',
  'organization',
  'ip_address',
  'domain',
  'email',
  'phone',
  'username',
  'malware',
  'vulnerability',
  'system',
  'social_profile',
  'other',
]);

export const threatLevelEnum = pgEnum('threat_level', [
  'unknown',
  'low',
  'medium',
  'high',
  'critical',
]);

export const reportStatusEnum = pgEnum('report_status', [
  'draft',
  'published',
  'archived',
]);

export const trackingLinkStatusEnum = pgEnum('tracking_link_status', [
  'active',
  'expired',
  'disabled',
]);

export const osintSearchTypeEnum = pgEnum('osint_search_type', [
  'username',
  'email',
  'phone',
  'domain',
  'ip',
  'image',
]);

export const jobStatusEnum = pgEnum('job_status', [
  'queued',
  'processing',
  'completed',
  'failed',
]);

// User & Authentication Tables (Better Auth Compatible)
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  passwordHash: text('password_hash'), // For credentials auth
  image: text('image'),
  role: text('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Settings (API Keys, Preferences)
export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),

  // Microsoft Foundry / Azure OpenAI Settings
  azureEndpoint: text('azure_endpoint'),
  azureApiKey: text('azure_api_key'),
  azureDeploymentName: text('azure_deployment_name'),
  azureApiVersion: text('azure_api_version').default('2024-02-15-preview'),

  // OpenAI Direct (fallback)
  openaiApiKey: text('openai_api_key'),

  //Ollama Settings
  ollamaBaseUrl: text('ollama_base_url'),
  ollamaModel: text('ollama_model'),
  ollamaEmbeddingModel: text('ollama_embedding_model'),

  // OSINT API Keys
  hunterApiKey: text('hunter_api_key'),
  shodanApiKey: text('shodan_api_key'),
  virusTotalApiKey: text('virustotal_api_key'),
  hibpApiKey: text('hibp_api_key'),

  // Tracking Settings
  ipinfoToken: text('ipinfo_token'),

  // Preferences
  defaultAiModel: text('default_ai_model').default('gpt-4'),
  darkMode: boolean('dark_mode').default(true),
  notifications: boolean('notifications').default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Intelligence Entities
export const entities = pgTable('entities', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),

  name: text('name').notNull(),
  type: entityTypeEnum('type').notNull(),
  description: text('description'),
  threatLevel: threatLevelEnum('threat_level').default('unknown'),
  threatScore: integer('threat_score').default(0), // 0-100

  // Core identifiers
  email: text('email'),
  phone: text('phone'),
  username: text('username'),

  // Social media profiles (JSON)
  socialProfiles: jsonb('social_profiles').$type<{
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
    snapchat?: string;
    threads?: string;
    github?: string;
    [key: string]: string | undefined;
  }>(),

  // Location data
  location: jsonb('location').$type<{
    country?: string;
    city?: string;
    coordinates?: { lat: number; lng: number };
  }>(),

  // Metadata (flexible JSON for additional data)
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  // OSINT collected data
  osintData: jsonb('osint_data').$type<{
    breaches?: Array<{ name: string; date: string; data: string[] }>;
    pastUsernames?: string[];
    knownPasswords?: string[];
    associatedEmails?: string[];
    associatedPhones?: string[];
    registeredSites?: string[];
    [key: string]: unknown;
  }>(),

  // Image/avatar
  imageUrl: text('image_url'),

  // Tags for categorization
  tags: text('tags').array(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('entities_name_idx').on(table.name),
  typeIdx: index('entities_type_idx').on(table.type),
  emailIdx: index('entities_email_idx').on(table.email),
  userIdIdx: index('entities_user_id_idx').on(table.userId),
}));

// Entity Relationships
export const entityRelations = pgTable('entity_relations', {
  id: serial('id').primaryKey(),
  sourceEntityId: integer('source_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  targetEntityId: integer('target_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  relationType: text('relation_type').notNull(), // e.g., 'works_at', 'knows', 'owns', 'connected'
  strength: integer('strength').default(50), // 0-100 relationship strength
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index('relations_source_idx').on(table.sourceEntityId),
  targetIdx: index('relations_target_idx').on(table.targetEntityId),
}));

// Intelligence Reports
export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),

  title: text('title').notNull(),
  content: text('content').notNull(),
  summary: text('summary'),

  status: reportStatusEnum('status').default('draft'),
  threatLevel: threatLevelEnum('threat_level').default('unknown'),

  source: text('source'),
  sourceUrl: text('source_url'),

  // Related entities
  entityIds: integer('entity_ids').array(),

  // Tags
  tags: text('tags').array(),

  // AI-generated insights
  aiInsights: jsonb('ai_insights').$type<{
    summary?: string;
    keyFindings?: string[];
    recommendations?: string[];
    relatedThreats?: string[];
  }>(),

  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  titleIdx: index('reports_title_idx').on(table.title),
  statusIdx: index('reports_status_idx').on(table.status),
  userIdIdx: index('reports_user_id_idx').on(table.userId),
}));

// Vector Embeddings for Semantic Search
export const vectors = pgTable('vectors', {
  id: serial('id').primaryKey(),

  // Reference to source (one of these will be set)
  entityId: integer('entity_id').references(() => entities.id, { onDelete: 'cascade' }),
  reportId: integer('report_id').references(() => reports.id, { onDelete: 'cascade' }),

  // The embedding vector
  embedding: vector('embedding'),

  // The original text that was embedded
  text: text('text').notNull(),

  // Metadata about the embedding
  chunkIndex: integer('chunk_index').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  entityIdIdx: index('vectors_entity_id_idx').on(table.entityId),
  reportIdIdx: index('vectors_report_id_idx').on(table.reportId),
}));


// Tracking Links
export const trackingLinks = pgTable('tracking_links', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  entityId: integer('entity_id').references(() => entities.id, { onDelete: 'set null' }),

  code: text('code').notNull().unique(), // Short unique code for URL
  name: text('name'),
  destinationUrl: text('destination_url').notNull(),

  status: trackingLinkStatusEnum('status').default('active'),

  // Click tracking
  clickCount: integer('click_count').default(0),
  lastClickAt: timestamp('last_click_at'),

  // Expiration
  expiresAt: timestamp('expires_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  codeIdx: uniqueIndex('tracking_links_code_idx').on(table.code),
  userIdIdx: index('tracking_links_user_id_idx').on(table.userId),
}));

// Tracking Data (Collected from link clicks)
export const trackingData = pgTable('tracking_data', {
  id: serial('id').primaryKey(),
  trackingLinkId: integer('tracking_link_id').notNull().references(() => trackingLinks.id, { onDelete: 'cascade' }),

  // IP & Geo
  ipAddress: text('ip_address'),
  country: text('country'),
  region: text('region'),
  city: text('city'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  timezone: text('timezone'),
  isp: text('isp'),

  // Device info
  userAgent: text('user_agent'),
  browser: text('browser'),
  browserVersion: text('browser_version'),
  os: text('os'),
  osVersion: text('os_version'),
  device: text('device'),
  deviceType: text('device_type'), // mobile, tablet, desktop

  // Network
  isVpn: boolean('is_vpn').default(false),
  isProxy: boolean('is_proxy').default(false),
  isTor: boolean('is_tor').default(false),

  // Referrer
  referrer: text('referrer'),

  // Additional data
  language: text('language'),
  screenResolution: text('screen_resolution'),

  clickedAt: timestamp('clicked_at').defaultNow().notNull(),
}, (table) => ({
  linkIdIdx: index('tracking_data_link_id_idx').on(table.trackingLinkId),
  ipIdx: index('tracking_data_ip_idx').on(table.ipAddress),
}));

// OSINT Search History
export const osintSearches = pgTable('osint_searches', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  entityId: integer('entity_id').references(() => entities.id, { onDelete: 'set null' }),

  searchType: osintSearchTypeEnum('search_type').notNull(),
  query: text('query').notNull(),

  // Results
  results: jsonb('results').$type<{
    platforms: Array<{
      name: string;
      url?: string;
      exists: boolean;
      data?: Record<string, unknown>;
    }>;
    summary?: string;
  }>(),

  // Status
  status: text('status').default('pending'), // pending, processing, completed, failed
  error: text('error'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  userIdIdx: index('osint_searches_user_id_idx').on(table.userId),
  queryIdx: index('osint_searches_query_idx').on(table.query),
}));

// Background Job Queue (for Web Scraping)
export const jobQueue = pgTable('job_queue', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  entityId: integer('entity_id').references(() => entities.id, { onDelete: 'set null' }),

  // Job details
  targetUrl: text('target_url').notNull(),
  targetUsername: text('target_username'), // Username to scrape
  platform: text('platform'), // e.g., 'instagram', 'twitter', 'github'
  searchType: osintSearchTypeEnum('search_type'), // Type of OSINT search

  // Status tracking
  status: jobStatusEnum('status').default('queued'),

  // Results
  scrapedData: jsonb('scraped_data').$type<{
    // Basic profile info
    profile?: {
      username?: string;
      displayName?: string;
      bio?: string;
      location?: string;
      website?: string;
      avatarUrl?: string;
      verified?: boolean;
      createdAt?: string;
    };
    // Social stats
    stats?: {
      followers?: number;
      following?: number;
      posts?: number;
      likes?: number;
    };
    // Contact info
    contact?: {
      email?: string;
      phone?: string;
      otherEmails?: string[];
      otherPhones?: string[];
    };
    // Activity data
    activity?: {
      lastPost?: string;
      lastActive?: string;
      postingFrequency?: string;
    };
    // Additional data
    metadata?: Record<string, unknown>;
    // Raw data for debugging
    rawHtml?: string;
    rawData?: Record<string, unknown>;
  }>(),

  // Error tracking
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),

  // Timing
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('job_queue_status_idx').on(table.status),
  userIdIdx: index('job_queue_user_id_idx').on(table.userId),
  entityIdIdx: index('job_queue_entity_id_idx').on(table.entityId),
  createdAtIdx: index('job_queue_created_at_idx').on(table.createdAt),
}));

// Activity Log
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),

  action: text('action').notNull(), // e.g., 'entity.created', 'search.performed'
  resourceType: text('resource_type'), // e.g., 'entity', 'report', 'search'
  resourceId: text('resource_id'),

  details: jsonb('details'),

  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('activity_logs_user_id_idx').on(table.userId),
  actionIdx: index('activity_logs_action_idx').on(table.action),
  createdAtIdx: index('activity_logs_created_at_idx').on(table.createdAt),
}));

// Relations (Drizzle ORM)
export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  settings: one(userSettings),
  entities: many(entities),
  reports: many(reports),
  trackingLinks: many(trackingLinks),
  osintSearches: many(osintSearches),
  activityLogs: many(activityLogs),
}));

export const entitiesRelations = relations(entities, ({ many }) => ({
  outgoingRelationships: many(relationships, {
    relationName: "sourceEntity",
  }),
  incomingRelationships: many(relationships, {
    relationName: "targetEntity",
  }),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  user: one(users, {
    fields: [reports.userId],
    references: [users.id],
  }),
  vectors: many(vectors),
}));

export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  sourceEntityId: integer("source_entity_id").notNull().references(() => entities.id),
  targetEntityId: integer("target_entity_id").notNull().references(() => entities.id),
  type: text("type").notNull(), // "colleague", "employer", "family", "associate", etc.
  strength: integer("strength").notNull().default(50), // 0-100 confidence score
  context: text("context"), // How they're related
  evidence: jsonb("evidence").$type<{
    sources: string[];
    mentions: number;
    sharedPlatforms: string[];
    mutualConnections?: number;
  }>(),
  discoveredAt: timestamp("discovered_at").defaultNow(),
  lastVerified: timestamp("last_verified"),
  status: text("status").default("active"), // "active", "archived", "disputed"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  sourceEntity: one(entities, {
    fields: [relationships.sourceEntityId],
    references: [entities.id],
    relationName: "sourceEntity",
  }),
  targetEntity: one(entities, {
    fields: [relationships.targetEntityId],
    references: [entities.id],
    relationName: "targetEntity",
  }),
}));

export const networkMetrics = pgTable("network_metrics", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").notNull().references(() => entities.id),
  totalConnections: integer("total_connections").default(0),
  strongConnections: integer("strong_connections").default(0), // strength > 70
  weakConnections: integer("weak_connections").default(0), // strength < 40
  influenceScore: integer("influence_score").default(0), // 0-100
  centralityScore: real("centrality_score").default(0), // Network centrality
  clusterCoefficient: real("cluster_coefficient").default(0), // How connected are their connections
  averagePathLength: real("average_path_length"), // Average distance to other nodes
  calculatedAt: timestamp("calculated_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Investigation Traces 
export const investigationTraces = pgTable("investigation_traces", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  entityId: integer("entity_id").references(() => entities.id, { onDelete: "set null" }),
  target: text("target").notNull(),
  status: text("status").notNull(),
  planVersion: integer("plan_version").default(1),
  steps: jsonb("steps"),
  errors: jsonb("errors"),
  replanEvents: jsonb("replan_events"),
  totalLatencyMs: integer("total_latency_ms"),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type Exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
export type EntityRelation = typeof entityRelations.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type Vector = typeof vectors.$inferSelect;
export type TrackingLink = typeof trackingLinks.$inferSelect;
export type TrackingData = typeof trackingData.$inferSelect;
export type OsintSearch = typeof osintSearches.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type JobQueue = typeof jobQueue.$inferSelect;
export type NewJobQueue = typeof jobQueue.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;
export type NewRelationship = typeof relationships.$inferInsert;

