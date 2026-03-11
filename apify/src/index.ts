/**
 * SEPTO OSINT Scraper - Apify Actor
 *
 * This Actor scrapes social media profiles for OSINT data.
 *
 * Input (via stdin or API):
 * {
 *   "targetUrl": "https://github.com/username",
 *   "targetUsername": "username",  // optional
 *   "platform": "github",          // optional, auto-detected
 *   "searchType": "username",      // optional
 *   "headless": true,              // optional
 *   "blockResources": true,        // optional
 *   "timeout": 60,                 // optional (seconds)
 *   "proxy": false                 // optional
 * }
 *
 * Output:
 * {
 *   "profile": { ... },
 *   "stats": { ... },
 *   "contact": { ... },
 *   "metadata": { ... }
 * }
 */

import { Actor } from 'apify';
import { PlaywrightCrawler, log } from 'crawlee';
import { firefox } from 'playwright';

// ============================================
// Platform Selectors
// ============================================

const PLATFORM_SELECTORS: Record<string, Record<string, string>> = {
  github: {
    username: '[itemprop="name"]',
    bio: '[itemprop="description"]',
    location: '[itemprop="location"]',
    website: '[itemprop="url"]',
    avatar: '[itemprop="image"]',
    followers: '[href$="followers"] .Counter',
    following: '[href$="following"] .Counter',
    repos: '[href$="repositories"] .Counter',
    company: '[itemprop="worksFor"]',
  },
  twitter: {
    displayName: '[data-testid="UserDisplayName"]',
    username: '[data-testid="UserName"] .r-1dz6i5r',
    bio: '[data-testid="UserDescription"]',
    location: '[data-testid="UserLocation"]',
    website: '[data-testid="UserUrl"]',
    avatar: '[data-testid="UserAvatar"]',
    followers: '[href$="/followers"] span',
    following: '[href$="/following"]',
    posts: '[data-testid="UserTweets"]',
  },
  instagram: {
    username: 'h2',
    displayName: 'h2',
    bio: '.-vDIk span',
    location: '.-vDIk span:nth-child(3)',
    avatar: 'img[alt*="profile"]',
    followers: 'a[href$="followers/"] span',
    following: 'a[href$="following/"] span',
    posts: 'span._ac2a',
  },
  linkedin: {
    displayName: '.text-heading-xlarge',
    headline: '.top-card__headline',
    bio: '.top-card__summary-text',
    location: '.top-card__location',
    website: '.top-card__website a',
    avatar: '.profile-photo img',
    followers: '.top-card__followers-count',
    connections: '.top-card__connections-count',
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Detect platform from URL
 */
function detectPlatform(url: string): string {
  const urlLower = url.toLowerCase();

  if (urlLower.includes('github.com')) return 'github';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
  if (urlLower.includes('instagram.com')) return 'instagram';
  if (urlLower.includes('linkedin.com')) return 'linkedin';
  if (urlLower.includes('facebook.com')) return 'facebook';
  if (urlLower.includes('tiktok.com')) return 'tiktok';

  return 'generic';
}

/**
 * Extract username from URL
 */
function extractUsername(url: string, platform: string): string {
  const patterns: Record<string, RegExp> = {
    github: /github\.com\/([^\/\?]+)/,
    twitter: /twitter\.com\/([^\/\?]+)/,
    instagram: /instagram\.com\/([^\/\?]+)/,
    linkedin: /linkedin\.com\/in\/([^\/\?]+)/,
    facebook: /facebook\.com\/([^\/\?]+)/,
    tiktok: /tiktok\.com\/@?([^\/\?]+)/,
  };

  const pattern = patterns[platform] || /([^\/]+)$/;
  const match = url.match(pattern);
  return match ? match[1] : url;
}

/**
 * Parse number from formatted string (e.g., "1,234" -> 1234)
 */
function parseNumber(str: string | undefined): number | undefined {
  if (!str) return undefined;
  const cleaned = str.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : undefined;
}

// ============================================
// Main Actor Logic
// ============================================

interface Input {
  targetUrl: string;
  targetUsername?: string;
  platform?: string;
  searchType?: string;
  headless?: boolean;
  blockResources?: boolean;
  timeout?: number;
  proxy?: boolean;
}

interface Output {
  profile?: {
    username?: string;
    displayName?: string;
    bio?: string;
    location?: string;
    website?: string;
    avatarUrl?: string;
    verified?: boolean;
    createdAt?: string;
    company?: string;
  };
  stats?: {
    followers?: number;
    following?: number;
    posts?: number;
    likes?: number;
    connections?: number;
    repos?: number;
  };
  contact?: {
    email?: string;
    phone?: string;
  };
  activity?: {
    lastPost?: string;
    lastActive?: string;
  };
  metadata?: Record<string, unknown>;
  rawHtml?: string;
  error?: string;
}

let targetUrl: string;

async function main() {
  // Initialize the Apify SDK
  await Actor.init();

  // Get input
  const input = (await Actor.getInput<Input>()) as Input || {};

  const {
    targetUrl: url,
    targetUsername,
    platform: platformInput,
    searchType = 'username',
    headless = true,
    blockResources = true,
    timeout = 60,
    proxy = false,
  } = input;

  targetUrl = url;

  // Validate input
  if (!targetUrl) {
    await Actor.pushData({ error: 'targetUrl is required' });
    await Actor.fail();
    return;
  }

  log.info(`[SEPTO Scraper] Starting scrape for: ${targetUrl}`);
  log.info(`[SEPTO Scraper] Search type: ${searchType}`);

  const platform = platformInput || detectPlatform(targetUrl);
  const username = targetUsername || extractUsername(targetUrl, platform);
  const selectors = PLATFORM_SELECTORS[platform] || {};
  const actualUrl = platform !== 'generic' && platform !== 'linkedin'
    ? targetUrl.replace(/^https?:\/\/(www\.)?/, `https://${platform}.com/`)
    : targetUrl;

  let collectedData: Record<string, any> = {};

  // Create proxy configuration
  let proxyConfiguration: any;
  if (proxy) {
    proxyConfiguration = await Actor.createProxyConfiguration({
      groups: ['RESIDENTIAL'],
      countryCode: 'US',
    });
  }

  // Create the crawler
  const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    requestHandler: async ({ page, request }: { page: any; request: any }) => {
      log.info(`[SEPTO Scraper] Processing: ${request.url}`);

      // Set up stealth mode
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Block resources if enabled
      if (blockResources) {
        await page.route('**/*', (route: { request: () => { (): any; new(): any; resourceType: { (): any; new(): any; }; }; abort: () => void; continue: () => void; }) => {
          const resourceType = route.request().resourceType();
          if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            route.abort();
            return;
          }
          route.continue();
        });
      }

      // Wait for page to load
      try {
        await page.waitForLoadState('networkidle', { timeout: timeout * 1000 });
      } catch {
        log.warning(`[SEPTO Scraper] Timeout waiting for networkidle, continuing...`);
      }

      // Extract data based on platform selectors
      for (const [field, selector] of Object.entries(selectors)) {
        try {
          const element = await page.$(selector);
          if (element) {
            let value: string | null = null;

            // Try different ways to get the value
            if (field === 'avatar' || field === 'avatarUrl') {
              value = await element.getAttribute('src') || await element.getAttribute('alt');
            } else {
              value = await element.textContent();
            }

            if (value) {
              collectedData[field] = value.trim();
            }
          }
        } catch (e) {
          log.debug(`[SEPTO Scraper] Could not extract ${field}: ${e}`);
        }
      }

      // Get page title as fallback
      if (!collectedData.displayName) {
        collectedData.displayName = await page.title();
      }

      // Get page content for raw data
      collectedData.rawHtml = await page.content();
    },
    maxRequestRetries: 3,
    maxRequestsPerMinute: 20,
    launchContext: {
      launcher: firefox,
      launchOptions: {
        headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      },
    },
  });

  // Run the crawler
  await crawler.run([actualUrl]);

  // Process the collected data
  const result: Output = {
    profile: {
      username: collectedData.username || username,
      displayName: collectedData.displayName,
      bio: collectedData.bio || collectedData.headline,
      location: collectedData.location,
      website: collectedData.website,
      avatarUrl: collectedData.avatar,
      company: collectedData.company,
    },
    stats: {
      followers: parseNumber(collectedData.followers),
      following: parseNumber(collectedData.following),
      posts: parseNumber(collectedData.posts || collectedData.repos),
      connections: parseNumber(collectedData.connections),
    },
    metadata: {
      platform,
      searchType,
      targetUrl,
      username,
      scrapedAt: new Date().toISOString(),
      actorVersion: '1.0.0',
    },
    rawHtml: collectedData.rawHtml?.substring(0, 50000), // Limit size
  };

  log.info(`[SEPTO Scraper] Scraping completed successfully`);

  // Save output
  await Actor.pushData(result);

  // Exit successfully
  await Actor.exit();
}

// Run the main function
main().catch(async (error) => {
  log.error(`[SEPTO Scraper] Fatal error: ${error.message}`);

  await Actor.pushData({
    error: error.message,
    metadata: {
      targetUrl,
      scrapedAt: new Date().toISOString(),
    },
  });

  await Actor.fail();
});
