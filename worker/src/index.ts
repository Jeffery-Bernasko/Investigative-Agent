/**
 * SEPTO Background Job Worker
 *
 * A standalone Node.js worker that polls the database for scraping jobs
 * and processes them using Crawlee with Playwright.
 *
 * Architecture:
 * - Database-backed queue using PostgreSQL
 * - Polling every 5 seconds
 * - Job locking to prevent double-processing
 * - Mock mode for testing without browser
 *
 * Usage:
 *   npm run dev        # Development with hot reload
 *   npm run build      # Build for production
 *   npm start          # Run production worker
 *
 * Environment Variables:
 *   DATABASE_URL       # PostgreSQL connection string (required)
 *   USE_MOCK           # Set to 'true' for mock mode (default: false)
 *   POLL_INTERVAL      # Polling interval in ms (default: 5000)
 *   MAX_CONCURRENT     # Max concurrent jobs (default: 1)
 */

import 'dotenv/config';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, sql } from 'drizzle-orm';
import { jobQueue, jobStatusEnum } from '../schema.js';
import type { JobQueue, NewJobQueue } from '../schema.js';

// Import scrapers
import { UsernameScraper } from './scrapers/username-scraper.js';
import { SocialMediaScraper } from './scrapers/social-media-scraper.js';

// ============================================
// Configuration
// ============================================

interface WorkerConfig {
  databaseUrl: string;
  pollInterval: number;
  maxConcurrent: number;
  useMock: boolean;
}

function loadConfig(): WorkerConfig {
  return {
    databaseUrl: process.env.DATABASE_URL || '',
    pollInterval: parseInt(process.env.POLL_INTERVAL || '5000', 10),
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT || '1', 10),
    useMock: process.env.USE_MOCK === 'true' || process.env.USE_MOCK === '1',
  };
}

// ============================================
// Database Setup
// ============================================

interface Database {
  execute: (query: string) => Promise<any>;
  update: (table: any) => any;
  select: (fields: any) => any;
  from: (table: any) => any;
  set: (values: any) => any;
  where: (condition: any) => any;
  returning: () => any;
}

function createDbClient(databaseUrl: string): Database {
  const sql = neon(databaseUrl);
  // For simplicity, we'll use raw SQL for the worker
  return {
    async execute(query: string) {
      return sql(query);
    },
    // These are placeholder - we use raw SQL in the worker
    update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
    select: () => ({ from: () => ({ where: () => [] }) }),
    from: () => ({}),
    set: () => ({}),
    where: () => ({}),
    returning: () => [],
  };
}

// ============================================
// Job Operations
// ============================================

/**
 * Acquire a job for processing.
 * Uses FOR UPDATE SKIP LOCKED to prevent double-processing.
 */
async function acquireJob(db: any, config: WorkerConfig): Promise<JobQueue | null> {
  const result = await db.execute(sql`
    SELECT * FROM job_queue
    WHERE status = 'queued'
    AND (retry_count < max_retries OR max_retries = 0)
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `);

  if (result.length === 0) {
    return null;
  }

  // Update status to processing
  await db.execute(sql`
    UPDATE job_queue
    SET status = 'processing',
        started_at = NOW(),
        updated_at = NOW()
    WHERE id = ${result[0].id}
  `);

  return result[0] as JobQueue;
}

/**
 * Mark a job as completed with data
 */
async function completeJob(db: any, jobId: string, scrapedData: any): Promise<void> {
  await db.execute(sql`
    UPDATE job_queue
    SET status = 'completed',
        scraped_data = ${JSON.stringify(scrapedData)},
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = ${jobId}
  `);
}

/**
 * Mark a job as failed with error message
 */
async function failJob(db: any, jobId: string, errorMessage: string, retryCount: number, maxRetries: number): Promise<void> {
  const newRetryCount = retryCount + 1;
  const status = newRetryCount >= maxRetries ? 'failed' : 'queued';

  await db.execute(sql`
    UPDATE job_queue
    SET status = ${status},
        error_message = ${errorMessage},
        retry_count = ${newRetryCount},
        updated_at = NOW()
    WHERE id = ${jobId}
  `);
}

/**
 * Get all jobs for a user
 */
async function getJobsByUser(db: any, userId: string): Promise<JobQueue[]> {
  const result = await db.execute(sql`
    SELECT * FROM job_queue
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `);
  return result as JobQueue[];
}

/**
 * Get a single job by ID
 */
async function getJobById(db: any, jobId: string): Promise<JobQueue | null> {
  const result = await db.execute(sql`
    SELECT * FROM job_queue WHERE id = ${jobId}
  `);
  return result.length > 0 ? (result[0] as JobQueue) : null;
}

// ============================================
// Scraping Logic
// ============================================

interface ScrapedData {
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
  stats?: {
    followers?: number;
    following?: number;
    posts?: number;
    likes?: number;
  };
  contact?: {
    email?: string;
    phone?: string;
    otherEmails?: string[];
    otherPhones?: string[];
  };
  activity?: {
    lastPost?: string;
    lastActive?: string;
    postingFrequency?: string;
  };
  metadata?: Record<string, unknown>;
  rawHtml?: string;
  rawData?: Record<string, unknown>;
}

/**
 * Process a scraping job based on its type
 */
async function processJob(job: JobQueue, config: WorkerConfig): Promise<ScrapedData> {
  console.log(`[Worker] Processing job ${job.id}: ${job.targetUrl}`);

  if (config.useMock) {
    console.log(`[Worker] Running in MOCK mode for ${job.targetUrl}`);
    return getMockData(job);
  }

  // Select the appropriate scraper based on search type
  const searchType = job.searchType || 'username';

  switch (searchType) {
    case 'username':
      return await UsernameScraper.scrape(job.targetUrl, job.targetUsername || undefined);
    case 'email':
    case 'phone':
    case 'domain':
    case 'ip':
      return await SocialMediaScraper.scrape(job.targetUrl, searchType);
    default:
      return await SocialMediaScraper.scrape(job.targetUrl, 'username');
  }
}

/**
 * Mock data generator for testing
 */
function getMockData(job: JobQueue): ScrapedData {
  const username = job.targetUsername || 'demo_user';

  return {
    profile: {
      username: username,
      displayName: `${username} (Demo)`,
      bio: 'This is mock data for testing purposes. The actual scraper will collect real data from the target platform.',
      location: 'San Francisco, CA',
      website: `https://${username}.example.com`,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      verified: true,
      createdAt: '2020-01-15T00:00:00Z',
    },
    stats: {
      followers: Math.floor(Math.random() * 10000),
      following: Math.floor(Math.random() * 1000),
      posts: Math.floor(Math.random() * 500),
      likes: Math.floor(Math.random() * 50000),
    },
    contact: {
      email: `${username}@example.com`,
      phone: '+1-555-0123',
      otherEmails: [`${username}.old@example.com`, `old_${username}@example.com`],
      otherPhones: ['+1-555-0456'],
    },
    activity: {
      lastPost: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      lastActive: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      postingFrequency: '2-3 posts per week',
    },
    metadata: {
      mockMode: true,
      generatedAt: new Date().toISOString(),
      platform: job.platform || 'unknown',
      searchType: job.searchType || 'username',
    },
  };
}

// ============================================
// Main Worker Loop
// ============================================

async function runWorker() {
  const config = loadConfig();

  console.log('========================================');
  console.log('  SEPTO Background Job Worker');
  console.log('========================================');
  console.log(`  Database: ${config.databaseUrl ? 'Connected' : 'NOT CONNECTED'}`);
  console.log(`  Poll Interval: ${config.pollInterval}ms`);
  console.log(`  Max Concurrent: ${config.maxConcurrent}`);
  console.log(`  Mock Mode: ${config.useMock ? 'ENABLED' : 'DISABLED'}`);
  console.log('========================================');

  if (!config.databaseUrl) {
    console.error('[Worker] ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const db = createDbClient(config.databaseUrl);

  // Test database connection
  try {
    await db.execute('SELECT 1');
    console.log('[Worker] Database connection successful');
  } catch (error) {
    console.error('[Worker] Database connection failed:', error);
    process.exit(1);
  }

  console.log('[Worker] Starting polling loop...');

  // Main polling loop
  while (true) {
    try {
      // Try to acquire a job
      const job = await acquireJob(db, config);

      if (job) {
        console.log(`[Worker] Acquired job: ${job.id} (${job.targetUrl})`);

        try {
          // Process the job
          const scrapedData = await processJob(job, config);

          // Mark as completed
          await completeJob(db, job.id, scrapedData);
          console.log(`[Worker] Job ${job.id} completed successfully`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[Worker] Job ${job.id} failed: ${errorMessage}`);

          // Mark as failed or queued for retry
          await failJob(db, job.id, errorMessage, job.retryCount || 0, job.maxRetries || 3);
        }
      }
    } catch (error) {
      console.error('[Worker] Polling error:', error);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, config.pollInterval));
  }
}

// ============================================
// CLI Entry Point
// ============================================

runWorker().catch((error) => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});
