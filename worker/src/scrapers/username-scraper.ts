/**
 * Username Scraper
 *
 * Scrapes username information from various social media platforms.
 * Uses Crawlee with Playwright for robust web scraping.
 *
 * Features:
 * - Blocks unnecessary resources (images, CSS, fonts)
 * - Anti-detection measures
 * - Platform-specific selectors
 */

import { PlaywrightCrawler, log } from 'crawlee';
import type { ScrapedData } from './index.js';

// ============================================
// Platform URL Patterns
// ============================================

const PLATFORM_PATTERNS = {
  github: {
    url: (username: string) => `https://github.com/${username}`,
    selectors: {
      username: '[itemprop="name"]',
      bio: '[itemprop="description"]',
      location: '[itemprop="location"]',
      website: '[itemprop="url"]',
      avatar: '[itemprop="image"]',
      followers: '[href$="followers"] .Counter',
      following: '[href$="following"] .Counter',
      repos: '[href$="repositories"] .Counter',
      createdAt: '[datetime]',
    },
  },
  twitter: {
    url: (username: string) => `https://twitter.com/${username}`,
    selectors: {
      username: '[data-testid="UserName"]',
      displayName: '[data-testid="UserDisplayName"]',
      bio: '[data-testid="UserDescription"]',
      location: '[data-testid="UserLocation"]',
      website: '[data-testid="UserUrl"]',
      avatar: '[data-testid="UserAvatar"]',
      followers: '[href$="/followers"] span',
      following: '[href$="/following"] span',
      posts: '[data-testid="UserTweets"]',
    },
  },
  instagram: {
    url: (username: string) => `https://www.instagram.com/${username}`,
    selectors: {
      username: 'h2',
      displayName: 'h2',
      bio: '.-vDIk span',
      location: '.-vDIk span:nth-child(3)',
      avatar: 'img[alt*="profile"]',
      followers: 'a[href$="followers/"] span',
      following: 'a[href$="following/"] span',
      posts: 'span._ac2a',
    },
  },
  linkedin: {
    url: (username: string) => `https://www.linkedin.com/in/${username}`,
    selectors: {
      username: '.text-heading-xlarge',
      displayName: '.text-heading-xlarge',
      bio: '.top-card__subtitle',
      location: '.top-card__location',
      website: '.top-card__website a',
      avatar: '.profile-photo img',
    },
  },
};

// ============================================
// Scraper Class
// ============================================

export class UsernameScraper {
  /**
   * Scrape username information from a URL
   */
  static async scrape(targetUrl: string, username?: string): Promise<ScrapedData> {
    const platform = detectPlatform(targetUrl);
    log.info(`[UsernameScraper] Scraping ${platform}: ${targetUrl}`);

    if (!username) {
      // Try to extract username from URL
      username = extractUsername(targetUrl, platform);
    }

    const platformConfig = PLATFORM_PATTERNS[platform as keyof typeof PLATFORM_PATTERNS];
    const actualUrl = platformConfig ? platformConfig.url(username) : targetUrl;

    if (platformConfig) {
      return await this.scrapeWithPlaywright(actualUrl, platform, platformConfig.selectors);
    } else {
      return await this.scrapeGeneric(targetUrl);
    }
  }

  /**
   * Scrape using Playwright with Crawlee
   */
  private static async scrapeWithPlaywright(
    url: string,
    platform: string,
    selectors: Record<string, string>
  ): Promise<ScrapedData> {
    return new Promise((resolve, reject) => {
      let collectedData: any = {};

      const crawler = new PlaywrightCrawler({
        requestHandler: async ({ page, request }) => {
          log.info(`[UsernameScraper] Processing: ${request.url}`);

          try {
            // Set up anti-detection
            await this.setupStealth(page);

            // Block unnecessary resources
            await this.blockResources(page);

            // Extract data based on platform
            for (const [field, selector] of Object.entries(selectors)) {
              try {
                const element = await page.$(selector);
                if (element) {
                  const text = await element.textContent() ||
                    await element.getAttribute('alt') ||
                    await element.getAttribute('content') ||
                    '';
                  collectedData[field] = text.trim();
                }
              } catch (e) {
                log.debug(`[UsernameScraper] Could not extract ${field}: ${e}`);
              }
            }

            // Get page content for raw data
            collectedData.rawHtml = await page.content();
            collectedData.metadata = {
              platform,
              url: request.url,
              scrapedAt: new Date().toISOString(),
            };

          } catch (error) {
            log.error(`[UsernameScraper] Error scraping ${request.url}: ${error}`);
            throw error;
          }
        },
        maxRequestRetries: 3,
        maxRequestsPerMinute: 20,
        // Headless browser context
        launchContext: {
          launcher: async () => {
            const { firefox } = await import('playwright');
            return firefox;
          },
          launchOptions: {
            headless: true,
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
      crawler.run([url]).then(async () => {
        // Process collected data
        const result = this.processData(collectedData, platform);
        resolve(result);
      }).catch(reject);
    });
  }

  /**
   * Scrape generic webpage
   */
  private static async scrapeGeneric(url: string): Promise<ScrapedData> {
    return new Promise((resolve, reject) => {
      let collectedData: any = {};

      const crawler = new PlaywrightCrawler({
        requestHandler: async ({ page, request }) => {
          log.info(`[UsernameScraper] Generic scrape: ${request.url}`);

          await this.setupStealth(page);
          await this.blockResources(page);

          // Generic data extraction
          collectedData.profile = {
            displayName: await page.title(),
          };
          collectedData.rawHtml = await page.content();
          collectedData.metadata = {
            url: request.url,
            scrapedAt: new Date().toISOString(),
          };
        },
        maxRequestRetries: 3,
        launchContext: {
          launcher: async () => {
            const { firefox } = await import('playwright');
            return firefox;
          },
          launchOptions: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          },
        },
      });

      crawler.run([url]).then(() => {
        resolve(this.processData(collectedData, 'generic'));
      }).catch(reject);
    });
  }

  /**
   * Set up stealth mode to avoid detection
   */
  private static async setupStealth(page: any): Promise<void> {
    // Override webdriver
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Remove automation flags
    await page.addInitScript(() => {
      // @ts-ignore
      delete navigator.__driverApi__;
      // @ts-ignore
      delete navigator.__webdriver__;
    });

    // Set realistic user agent
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);

    // Set realistic viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
  }

  /**
   * Block unnecessary resources to save bandwidth
   */
  private static async blockResources(page: any): Promise<void> {
    await page.route('**/*', (route: any) => {
      const resourceType = route.request().resourceType();
      const url = route.request().url();

      // Block images, CSS, fonts, media
      if (['image', 'stylesheet', 'font', 'media', 'other'].includes(resourceType)) {
        route.abort();
        return;
      }

      // Allow scripts and documents
      route.continue();
    });
  }

  /**
   * Process and normalize collected data
   */
  private static processData(data: any, platform: string): ScrapedData {
    // Parse numbers from formatted strings (e.g., "1,234" -> 1234)
    const parseNumber = (str: string): number | undefined => {
      if (!str) return undefined;
      const cleaned = str.replace(/[^0-9]/g, '');
      return cleaned ? parseInt(cleaned, 10) : undefined;
    };

    return {
      profile: {
        username: data.username || data.displayName || undefined,
        displayName: data.displayName || undefined,
        bio: data.bio || undefined,
        location: data.location || undefined,
        website: data.website || undefined,
        avatarUrl: data.avatar || undefined,
      },
      stats: {
        followers: parseNumber(data.followers),
        following: parseNumber(data.following),
        posts: parseNumber(data.posts || data.repos),
      },
      metadata: data.metadata,
      rawHtml: data.rawHtml?.substring(0, 10000), // Limit raw HTML size
    };
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Detect social media platform from URL
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
 * Extract username from URL based on platform
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
