/**
 * Apify Integration for SEPTO Worker
 *
 * This module provides integration with Apify Actor for web scraping.
 * Use this instead of local Playwright when you want cloud-based scraping.
 */

import type { ScrapedData } from './scrapers/index.js';

// ============================================
// Configuration
// ============================================

interface ApifyConfig {
  actorId: string;
  apiToken: string;
  timeout: number;
}

function getConfig(): ApifyConfig {
  return {
    actorId: process.env.APIFY_ACTOR_ID || '',
    apiToken: process.env.APIFY_API_TOKEN || '',
    timeout: parseInt(process.env.APIFY_TIMEOUT || '30000', 10),
  };
}

// ============================================
// API Calls
// ============================================

/**
 * Run an Apify Actor synchronously and get results immediately
 */
export async function runApifyActorSync(
  targetUrl: string,
  options?: {
    targetUsername?: string;
    platform?: string;
    searchType?: string;
  }
): Promise<ScrapedData | null> {
  const config = getConfig();

  if (!config.actorId || !config.apiToken) {
    throw new Error('APIFY_ACTOR_ID and APIFY_API_TOKEN must be configured');
  }

  const input = {
    targetUrl,
    targetUsername: options?.targetUsername,
    platform: options?.platform,
    searchType: options?.searchType || 'username',
    headless: true,
    blockResources: true,
    timeout: 60,
    proxy: false,
  };

  const response = await fetch(
    `https://api.apify.com/v2/acts/${config.actorId}/run-sync-get-dataset-items`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Apify API error: ${response.status} - ${error}`);
  }

  const results = await response.json();
  return results[0] || null;
}

/**
 * Start an Apify Actor run asynchronously
 */
export async function startApifyActorRun(
  targetUrl: string,
  options?: {
    targetUsername?: string;
    platform?: string;
    searchType?: string;
  }
): Promise<string> {
  const config = getConfig();

  if (!config.actorId || !config.apiToken) {
    throw new Error('APIFY_ACTOR_ID and APIFY_API_TOKEN must be configured');
  }

  const input = {
    targetUrl,
    targetUsername: options?.targetUsername,
    platform: options?.platform,
    searchType: options?.searchType || 'username',
  };

  const response = await fetch(
    `https://api.apify.com/v2/acts/${config.actorId}/runs`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Apify API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data.id;
}

/**
 * Get results from an Apify Actor run
 */
export async function getApifyRunResults(
  runId: string
): Promise<ScrapedData | null> {
  const config = getConfig();

  const response = await fetch(
    `https://api.apify.com/v2/acts/${config.actorId}/runs/${runId}/dataset/items`,
    {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Apify API error: ${response.status}`);
  }

  const results = await response.json();
  return results[0] || null;
}

/**
 * Check if an Apify run is still running
 */
export async function isApifyRunRunning(runId: string): Promise<boolean> {
  const config = getConfig();

  const response = await fetch(
    `https://api.apify.com/v2/acts/${config.actorId}/runs/${runId}`,
    {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
      },
    }
  );

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.data.status === 'running';
}

/**
 * Wait for an Apify run to complete and get results
 */
export async function waitForApifyResults(
  runId: string,
  maxWaitMs: number = 60000,
  pollIntervalMs: number = 2000
): Promise<ScrapedData | null> {
  const config = getConfig();
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const isRunning = await isApifyRunRunning(runId);

    if (!isRunning) {
      return await getApifyRunResults(runId);
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Apify run ${runId} timed out after ${maxWaitMs}ms`);
}

// ============================================
// Hybrid Worker Integration
// ============================================

/**
 * Process a job using Apify (for cloud scraping) or local (for testing)
 */
export async function processWithApify(
  targetUrl: string,
  options?: {
    targetUsername?: string;
    platform?: string;
    searchType?: string;
    useApify?: boolean;
    useMock?: boolean;
  }
): Promise<ScrapedData> {
  const useApify = options?.useApify ?? (process.env.USE_APIFY === 'true');
  const useMock = options?.useMock ?? (process.env.USE_MOCK === 'true');

  if (useMock) {
    // Return mock data for testing
    return getMockData(targetUrl, options?.targetUsername);
  }

  if (useApify) {
    console.log(`[Apify] Processing: ${targetUrl}`);
    return await runApifyActorSync(targetUrl, options);
  }

  throw new Error('Apify not enabled. Set USE_APIFY=true or pass useApify=true');
}

// Mock data for testing
function getMockData(url: string, username?: string): ScrapedData {
  const user = username || url.split('/').pop() || 'demo_user';

  return {
    profile: {
      username: user,
      displayName: `${user} (Mock)`,
      bio: 'This is mock data for testing purposes.',
      location: 'San Francisco, CA',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user}`,
    },
    stats: {
      followers: Math.floor(Math.random() * 10000),
      following: Math.floor(Math.random() * 1000),
      posts: Math.floor(Math.random() * 500),
    },
    metadata: {
      mockMode: true,
      url,
      scrapedAt: new Date().toISOString(),
    },
  };
}
