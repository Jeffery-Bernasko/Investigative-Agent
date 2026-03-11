/**
 * Social Media Scraper
 *
 * Scrapes data from various social media platforms.
 * Works with Email, Phone, Domain, and IP searches.
 */

import { PlaywrightCrawler, log } from 'crawlee';
import type { ScrapedData } from './index.js';

// ============================================
// Scraper Class
// ============================================

export class SocialMediaScraper {
  /**
   * Scrape social media data from a URL
   */
  static async scrape(targetUrl: string, searchType: string): Promise<ScrapedData> {
    log.info(`[SocialMediaScraper] Scraping ${searchType}: ${targetUrl}`);

    return new Promise((resolve, reject) => {
      let collectedData: any = {};

      const crawler = new PlaywrightCrawler({
        requestHandler: async ({ page, request }) => {
          log.info(`[SocialMediaScraper] Processing: ${request.url}`);

          try {
            // Set up anti-detection
            await this.setupStealth(page);

            // Block unnecessary resources
            await this.blockResources(page);

            // Extract page data
            collectedData.rawHtml = await page.content();

            // Get page title and basic info
            collectedData.profile = {
              displayName: await page.title(),
            };

            // Add metadata
            collectedData.metadata = {
              searchType,
              url: request.url,
              scrapedAt: new Date().toISOString(),
            };

          } catch (error) {
            log.error(`[SocialMediaScraper] Error scraping ${request.url}: ${error}`);
            throw error;
          }
        },
        maxRequestRetries: 3,
        maxRequestsPerMinute: 20,
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

      crawler.run([targetUrl]).then(() => {
        const result = this.processData(collectedData, searchType);
        resolve(result);
      }).catch(reject);
    });
  }

  /**
   * Set up stealth mode
   */
  private static async setupStealth(page: any): Promise<void> {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);
    await page.setViewportSize({ width: 1920, height: 1080 });
  }

  /**
   * Block unnecessary resources
   */
  private static async blockResources(page: any): Promise<void> {
    await page.route('**/*', (route: any) => {
      const resourceType = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media', 'other'].includes(resourceType)) {
        route.abort();
        return;
      }
      route.continue();
    });
  }

  /**
   * Process collected data
   */
  private static processData(data: any, searchType: string): ScrapedData {
    return {
      profile: {
        displayName: data.profile?.displayName || undefined,
        bio: data.profile?.bio || undefined,
      },
      metadata: {
        searchType,
        ...data.metadata,
      },
      rawHtml: data.rawHtml?.substring(0, 10000),
    };
  }
}
