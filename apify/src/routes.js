/**
 * SEPTO Scraper Routes (CommonJS)
 *
 * Handles scraping of social media profiles.
 */

const { createPlaywrightRouter, Dataset } = require('@crawlee/playwright');

const router = createPlaywrightRouter();

// Platform selectors for different social networks
const SELECTORS = {
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
    joinedDate: '[datetime][itemprop="date"]',
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
  generic: {
    title: 'title',
    metaDescription: 'meta[name="description"]',
  },
};

// Helper function to parse number from string
function parseNumber(str) {
  if (!str) return undefined;
  const cleaned = str.replace(/[^0-9,]/g, '').replace(/,/g, '');
  return cleaned ? parseInt(cleaned, 10) : undefined;
}

// Helper function to detect platform from URL
function detectPlatform(url) {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('github.com')) return 'github';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
  if (urlLower.includes('instagram.com')) return 'instagram';
  if (urlLower.includes('linkedin.com')) return 'linkedin';
  if (urlLower.includes('facebook.com')) return 'facebook';
  if (urlLower.includes('tiktok.com')) return 'tiktok';
  return 'generic';
}

// Default handler for all requests
router.addDefaultHandler(async ({ page, request, log }) => {
  const url = request.url;
  const platform = detectPlatform(url);
  const selectors = SELECTORS[platform] || SELECTORS.generic;

  log.info(`Scraping ${platform}: ${url}`);

  // Set up stealth mode - also override user agent via evaluate
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // Override user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      configurable: false
    });
  });

  // Wait for page to load
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await page.waitForTimeout(2000);
  } catch (e) {
    log.warning(`Timeout waiting for page load, continuing...`);
  }

  // Extract data based on platform selectors
  const data = {
    url: url,
    platform: platform,
    scrapedAt: new Date().toISOString(),
    profile: {},
    stats: {},
    metadata: {},
  };

  // Extract profile data
  for (const [field, selector] of Object.entries(selectors)) {
    try {
      const element = await page.$(selector);
      if (element) {
        let value = null;

        if (field === 'avatar' || field === 'avatarUrl') {
          value = await element.getAttribute('src') || await element.getAttribute('alt');
        } else {
          value = await element.textContent();
        }

        if (value) {
          const cleanValue = value.trim();
          if (['followers', 'following', 'posts', 'repos', 'connections'].includes(field)) {
            data.stats[field] = parseNumber(cleanValue);
          } else if (['username', 'displayName', 'bio', 'location', 'website', 'company'].includes(field)) {
            data.profile[field] = cleanValue;
          } else {
            data[field] = cleanValue;
          }
        }
      }
    } catch (e) {
      // Element not found, skip
    }
  }

  // Get page title as fallback
  if (!data.profile.displayName) {
    data.profile.displayName = await page.title();
  }

  // Get raw HTML for debugging (limited size)
  data.rawHtml = (await page.content()).substring(0, 50000);

  log.info(`Scraped ${platform} profile: ${data.profile.displayName || 'Unknown'}`);

  // Push data to dataset
  await Dataset.pushData(data);
});

module.exports = { router };
