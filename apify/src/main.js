/**
 * SEPTO OSINT Scraper - Main Entry Point (CommonJS)
 */

const { Actor } = require('apify');
const { PlaywrightCrawler, log } = require('crawlee');
const { firefox } = require('playwright');
const { router } = require('./routes.js');

async function main() {
  // Initialize the Apify SDK
  await Actor.init();

  // Get input - accept both old (startUrls) and new (targetUrl) format
  const input = (await Actor.getInput()) ?? {};
  const { targetUrl, startUrls = [] } = input;

  // Build the URL list
  const urls = [];
  if (targetUrl) {
    urls.push({ url: targetUrl, label: 'osint' });
  }
  if (Array.isArray(startUrls)) {
    for (const item of startUrls) {
      const url = typeof item === 'string' ? item : item?.url;
      if (url) {
        urls.push({ url, label: item?.label ?? 'osint' });
      }
    }
  }

  if (urls.length === 0) {
    log.error('No URLs provided. Please provide targetUrl or startUrls.');
    await Actor.fail();
  }

  // Proxy configuration
  const proxyConfiguration = await Actor.createProxyConfiguration({
    checkAccess: false,
  });

  const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    requestHandler: router,
    launchContext: {
      launcher: firefox,
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

  await crawler.run(urls.map(u => u.url));

  // Exit successfully
  await Actor.exit();
}

main().catch(async (error) => {
  console.error('Fatal error:', error);
  await Actor.fail();
});
