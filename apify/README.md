# SEPTO OSINT Scraper - Apify Actor

This is an Apify Actor that scrapes social media profiles for OSINT (Open Source Intelligence) data.

## Features

- Supports GitHub, Twitter/X, Instagram, LinkedIn, Facebook, TikTok
- Stealth mode to avoid detection
- Resource blocking for bandwidth optimization
- Configurable timeout and proxy settings
- Returns structured profile data

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `APIFY_API_TOKEN` | Your Apify API token for authentication. Get it from [Apify Console](https://console.apify.com/account/integrations) |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `APIFY_PROXY_PASSWORD` | Password for Apify proxy authentication | - |
| `APIFY_DEFAULT_BROWSER` | Browser to use (firefox, chromium, webkit) | `firefox` |
| `APIFY_HEADLESS` | Run in headless mode | `true` |

## Input Schema

The Actor accepts the following input (via `stdin` or API):

```json
{
  "targetUrl": "https://github.com/username",
  "targetUsername": "username",
  "platform": "github",
  "searchType": "username",
  "headless": true,
  "blockResources": true,
  "timeout": 60,
  "proxy": false
}
```

### Input Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetUrl` | string | ✅ | URL to scrape |
| `targetUsername` | string | ❌ | Username (auto-extracted if not provided) |
| `platform` | string | ❌ | Platform (auto-detected) |
| `searchType` | string | ❌ | Type of search (username, email, phone, domain, ip) |
| `headless` | boolean | ❌ | Run browser in headless mode |
| `blockResources` | boolean | ❌ | Block images/CSS/fonts |
| `timeout` | number | ❌ | Timeout in seconds (10-300) |
| `proxy` | boolean | ❌ | Use Apify residential proxy |

## Output Schema

```json
{
  "profile": {
    "username": "johndoe",
    "displayName": "John Doe",
    "bio": "Software Developer",
    "location": "San Francisco, CA",
    "website": "https://johndoe.com",
    "avatarUrl": "https://...",
    "company": "TechCorp"
  },
  "stats": {
    "followers": 1234,
    "following": 567,
    "posts": 89,
    "repos": 42
  },
  "metadata": {
    "platform": "github",
    "searchType": "username",
    "scrapedAt": "2024-01-15T10:30:00.000Z"
  },
  "rawHtml": "..."
}
```

## How to Deploy to Apify

### Option 1: Upload via Apify Console (Recommended)

1. **Build the Actor locally:**
   ```bash
   cd apify
   npm install
   npm run build
   ```

2. **Go to [Apify Console](https://console.apify.com)**

3. **Click "Create new Actor"**

4. **Choose "Upload from GitHub" or "Upload .zip":**
   - If uploading .zip: `zip -r actor.zip dist package.json package-lock.json`
   - Or upload the entire `apify/` folder

5. **Set the following in Actor settings:**
   - **Name:** `septo-osint-scraper`
   - **Version:** `1.0.0`
   - **Build command:** `npm run build`
   - **Start command:** `npm start`

6. **Add environment variable:**
   - `APIFY_API_TOKEN`: Your personal API token

7. **Save and Build**

### Option 2: CLI Deployment

1. **Install Apify CLI:**
   ```bash
   npm install -g apify-cli
   ```

2. **Login:**
   ```bash
   apify login
   ```

3. **Deploy:**
   ```bash
   cd apify
   apify push
   ```

### Option 3: GitHub Integration

1. Push the `apify/` folder to a GitHub repository

2. **In Apify Console:**
   - Click "Create new Actor"
   - Choose "GitHub repository"
   - Select your repository

3. **Configure:**
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

4. **Add `APIFY_API_TOKEN` in Actor settings → Environment variables**

## Running the Actor

### From Apify Console

1. Open your Actor in [Apify Console](https://console.apify.com)
2. Click "Run"
3. Enter the input JSON
4. Watch progress and get results

### Via API

```bash
# Start a run
curl -X POST "https://api.apify.com/v2/acts/YOUR_ACTOR_ID/runs" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://github.com/octocat",
    "platform": "github"
  }'

# Get results
curl "https://api.apify.com/v2/acts/YOUR_ACTOR_ID/runs/YOUR_RUN_ID/dataset/items" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### Synchronous Run (get results immediately)

```bash
curl -X POST "https://api.apify.com/v2/acts/YOUR_ACTOR_ID/run-sync" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://github.com/octocat"
  }'
```

## Integration with SEPTO App

Update your worker to use Apify instead of local Playwright:

```typescript
// In worker/src/index.ts - modify processJob()

async function processJob(job: JobQueue, config: WorkerConfig): Promise<ScrapedData> {
  if (config.useApify) {
    return await callApifyActor(job.targetUrl, job.targetUsername);
  }
  // ... local scraping logic
}

async function callApifyActor(url: string, username?: string): Promise<ScrapedData> {
  const response = await fetch(
    `https://api.apify.com/v2/acts/${process.env.APIFY_ACTOR_ID}/run-sync-get-dataset-items`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.APIFY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUrl: url,
        targetUsername: username,
      }),
    }
  );

  const data = await response.json();
  return data[0] || {};
}
```

## Pricing

| Resource | Cost |
|----------|------|
| Compute (per hour) | ~$0.02 |
| Residential Proxy (per GB) | ~$12.00 |
| Data transfer (per GB) | ~$0.10 |

**Estimated cost per 1000 requests:** ~$0.50 - $2.00 depending on proxy usage

## Troubleshooting

### Actor failing with "page crashed"

Try reducing timeout and adding more memory. In Actor settings:
- Memory: 2048 MB
- Timeout: 120 seconds

### Getting blocked by target site

1. Enable proxy in input: `"proxy": true`
2. Add delays between requests
3. Use residential proxies (costs extra)

### Timeout errors

Increase the `timeout` value in your input:
```json
{
  "timeout": 120
}
```

## Security Notes

- Never commit `APIFY_API_TOKEN` to git
- Use Apify secrets for API tokens in production
- Respect target websites' `robots.txt`
- Do not scrape behind authentication walls
- Comply with terms of service of target platforms

## License

MIT
