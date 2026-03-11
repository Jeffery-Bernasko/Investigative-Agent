# SEPTO Background Job Worker

A standalone Node.js worker service for web scraping OSINT data. This worker polls the database for scraping jobs and processes them using Crawlee with Playwright.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SEPTO Application                         │
│  ┌─────────────────┐  ┌─────────────────────────────────────┐   │
│  │  Next.js App    │  │        API Routes                   │   │
│  │  (Vercel)       │  │  POST /api/jobs                     │   │
│  │                 │  │  GET  /api/jobs/[id]                │   │
│  └────────┬────────┘  └─────────────────────────────────────┘   │
│           │                                                   │
│           │                                                   │
│           ▼                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Neon PostgreSQL Database                    │   │
│  │              (job_queue table)                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │                                                   │
│           │ Polling (every 5s)                                │
│           ▼                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Background Worker (Docker/Node.js)              │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  Polling Loop                                    │    │   │
│  │  │  ├── Acquire Job (FOR UPDATE SKIP LOCKED)       │    │   │
│  │  │  ├── Update Status → 'processing'               │    │   │
│  │  │  ├── Scrape Data (Crawlee/Playwright)           │    │   │
│  │  │  └── Update Status → 'completed'/'failed'       │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Important Deployment Notes

### ❌ CANNOT Deploy to Vercel

The worker **MUST NOT** be deployed to Vercel because:

1. **Serverless Functions Timeout**: Vercel functions have a maximum timeout (10-60 seconds depending on plan), but scraping jobs can take minutes.
2. **No Persistent State**: Serverless functions cannot maintain a polling loop.
3. **Edge Functions Limited**: Edge Functions have even stricter limits and cannot run headless browsers.
4. **Cost Implications**: High-frequency scraping on serverless would be extremely expensive.

### ✅ Supported Deployment Options

Deploy the worker as a **Background Service** on:

- **Railway** (Recommended)
  - Simple container deployment
  - Background worker support
  - Automatic restarts

- **Docker Compose**
  - Run alongside your app
  - Full control over resources

- **AWS ECS/Fargate**
  - Enterprise-grade container orchestration

- **DigitalOcean App Platform**
  - Background worker support

- **Render**
  - Background worker type available

## Quick Start

### 1. Install Dependencies

```bash
cd worker
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database URL
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string (required)
- `POLL_INTERVAL` - Polling interval in ms (default: 5000)
- `MAX_CONCURRENT` - Max concurrent jobs (default: 1)
- `USE_MOCK` - Enable mock mode for testing (default: false)

### 3. Run Locally

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

### 4. Test Mock Mode

```bash
USE_MOCK=true npm run dev
```

This will return fake data without launching a browser.

## Database Schema

The worker uses the `job_queue` table:

```sql
CREATE TABLE job_queue (
  id UUID PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  entity_id INTEGER REFERENCES entities(id),

  target_url TEXT NOT NULL,
  target_username TEXT,
  platform TEXT,
  search_type TEXT,

  status TEXT DEFAULT 'queued',
  scraped_data JSONB,

  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Create Job

```bash
POST /api/jobs
Content-Type: application/json

{
  "targetUrl": "https://github.com/username",
  "targetUsername": "username",
  "platform": "github",
  "searchType": "username",
  "entityId": 123
}
```

### Get Job Status

```bash
GET /api/jobs/[job-id]
```

### List All Jobs

```bash
GET /api/jobs
```

## Supported Platforms

The scraper supports the following platforms:

| Platform | URL Pattern | Search Types |
|----------|-------------|--------------|
| GitHub | github.com/{username} | username |
| Twitter/X | twitter.com/{username} | username |
| Instagram | instagram.com/{username} | username |
| LinkedIn | linkedin.com/in/{username} | username |
| Generic | Any URL | email, phone, domain, ip |

## Job Flow

1. **Queued**: Job is created via API
2. **Processing**: Worker picks up job, updates status
3. **Completed**: Successfully scraped data
4. **Failed**: Error occurred (may retry based on max_retries)

## Railway Deployment

### Option 1: Deploy with Dockerfile

1. Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

CMD ["node", "dist/index.js"]
```

2. Deploy to Railway:

```bash
railway init
railway up
```

### Option 2: Deploy with Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  worker:
    build: ./worker
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - POLL_INTERVAL=5000
      - USE_MOCK=false
    restart: unless-stopped
```

```bash
docker-compose up -d worker
```

## Monitoring

### Health Check

The worker logs to stdout. Key logs:

```
[Worker] Database connection successful
[Worker] Acquired job: [job-id] ([url])
[Worker] Job [job-id] completed successfully
[Worker] Job [job-id] failed: [error]
```

### Metrics to Watch

- Job processing time
- Success/failure rate
- Retry counts

## Troubleshooting

### Database Connection Failed

Ensure your `DATABASE_URL` is correct and the database is accessible from the worker network.

### Jobs Not Being Processed

1. Check worker logs for errors
2. Verify `job_queue.status = 'queued'`
3. Ensure no other worker is processing (job locking)

### Scraping Failures

1. Check `job_queue.error_message`
2. Verify the target URL is accessible
3. Try increasing `max_retries`
4. Consider rate limiting from target site

## Security Considerations

1. **Rate Limiting**: Respect target websites' robots.txt
2. **Authentication**: Never scrape behind login walls
3. **Data Privacy**: Handle scraped data according to GDPR/privacy laws
4. **API Keys**: Store sensitive keys in environment variables

## License

MIT
