# SEPTO - Threat Intelligence Dashboard

<div align="center">
  <img src="public/septo-logo.svg" alt="SEPTO Logo" width="120" height="120" />
  
  **Security & Entity Profiling Threat Observatory**
  
  A high-performance OSINT (Open Source Intelligence) web application for threat intelligence gathering, analysis, and visualization.

  [![Next.js](https://img.shields.io/badge/Next.js-14+-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Neon DB](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
</div>

---

## 🚀 Features

### Core Intelligence Capabilities
- **Entity Management** - Track and manage intelligence entities (people, organizations, IPs, domains, emails, etc.)
- **Relationship Visualization** - Interactive graph visualization using React Flow
- **Vector Search** - Semantic search powered by pgvector and AI embeddings
- **AI Analysis** - Natural language queries with Azure OpenAI / OpenAI integration

### 🕵️ Investigative Agent (Person-Focused OSINT)
- **Person Search** - Discover social media profiles across 20+ platforms from a full name
- **Website Discovery** - Detect personal sites, portfolios, and blogs associated with the target
- **Digital Footprint Analysis** - Presence breadth, identity consistency, risk signals, impersonation checks
- **PII Redaction** - Sensitive data (email/phone) is redacted by default; opt-in for raw values
- **Avatar Retrieval** - Downloads profile pictures from GitHub, Reddit, Mastodon, Dev.to and embeds them in the PDF
- **PDF Report** - Generates a formatted A4 PDF with profiles, websites, analysis, and recommendations
- **Pluggable Search** - Supports Tavily, SerpAPI (Google), and Bing Web Search; configure via env vars

#### Investigative Agent API

```bash
# Check service status
GET /api/investigative-agent

# Run an investigation
POST /api/investigative-agent
Content-Type: application/json
{
  "fullName": "Jane Doe",
  "location": "London",          # optional
  "employer": "Acme Corp",       # optional
  "usernameHints": ["janedoe"],  # optional, up to 5
  "includeRawPii": false         # default: false (redact PII)
}
```

Response includes `profiles`, `websites`, `footprintAnalysis`, and report metadata ready for PDF generation.

### OSINT Tools
- **Username Enumeration** - Search 200+ platforms for matching usernames
- **Email Intelligence** - Verify emails, check breaches (HIBP), Gravatar lookup
- **Domain Reconnaissance** - DNS records, VirusTotal, Shodan integration
- **Phone Number Analysis** - Validation, carrier detection, country identification

### Tracking & Attribution
- **Tracking Links** - Generate shareable URLs that collect visitor intelligence
- **IP Geolocation** - Powered by IPInfo.io
- **Device Detection** - Browser, OS, device type identification
- **VPN/Proxy/Tor Detection** - Identify anonymized visitors

### Dashboard & Analytics
- **Real-time Metrics** - Entity counts, threat levels, system health
- **Threat Analytics** - Charts and trends using Recharts
- **Activity Feed** - Recent intelligence reports and entity activity

---

## 🛠️ Technology Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14+ (App Router, SSR) |
| **Language** | TypeScript |
| **Database** | Neon DB (PostgreSQL) with pgvector |
| **ORM** | Drizzle ORM |
| **Authentication** | Better Auth |
| **AI/ML** | Azure OpenAI / OpenAI API |
| **Styling** | Tailwind CSS + Glassmorphism |
| **Visualization** | React Flow, Recharts |
| **State Management** | TanStack Query, Zustand |
| **Animations** | Framer Motion |

---

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **npm** or **pnpm** package manager
- **Neon DB** account (free tier available)
- **Optional APIs** for full functionality:
  - Azure OpenAI or OpenAI API key
  - Hunter.io API key
  - Shodan API key
  - VirusTotal API key
  - Have I Been Pwned API key
  - IPInfo.io token

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/septo.git
cd septo
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
# or
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
# ============================================
# SEPTO - Environment Configuration
# ============================================

# ===========================================
# DATABASE (Required)
# ===========================================
# Get this from: https://console.neon.tech/
DATABASE_URL="postgresql://username:password@ep-xxxxx.region.aws.neon.tech/septo?sslmode=require"

# ===========================================
# AUTHENTICATION
# ===========================================
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ===========================================
# AI / OPENAI (Optional - configure in Settings)
# ===========================================
# Users can configure these in the Settings page
# Or set them here for default use:

# OpenAI Direct
# OPENAI_API_KEY="sk-..."

# Azure OpenAI / Microsoft Foundry
# AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
# AZURE_OPENAI_API_KEY="your-api-key"
# AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4"
# AZURE_OPENAI_API_VERSION="2024-02-15-preview"

# ===========================================
# INVESTIGATIVE AGENT — Web Search (at least one required)
# ===========================================
# The agent automatically selects the first available provider.
# Override the selection with SEARCH_PROVIDER=tavily|serpapi|bing

# Tavily (recommended — social/web search optimised)
# Get key: https://app.tavily.com/
TAVILY_API_KEY="tvly-..."

# SerpAPI — Google search results via API
# Get key: https://serpapi.com/manage-api-key
# SERPAPI_API_KEY="your-serpapi-key"

# Bing Web Search API (Microsoft Azure)
# Get key: https://portal.azure.com/ → Bing Search resource
# BING_SEARCH_API_KEY="your-bing-key"

# Optional: force a specific provider ("tavily", "serpapi", or "bing")
# SEARCH_PROVIDER=tavily
```

### 4. Set Up the Database

#### Option A: Using Neon Console
1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Navigate to **SQL Editor**
4. Run the SQL from `drizzle/0001_complete_schema.sql`

#### Option B: Using Drizzle CLI
```bash
npm run db:push
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
septo/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Authentication pages
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Better Auth endpoints
│   │   │   ├── chat/           # AI chat API
│   │   │   ├── dashboard/      # Dashboard stats API
│   │   │   ├── entities/       # Entity CRUD API
│   │   │   ├── osint/          # OSINT search API
│   │   │   ├── reports/        # Reports API
│   │   │   ├── search/         # Vector search API
│   │   │   ├── settings/       # User settings API
│   │   │   └── tracking/       # Tracking links API
│   │   ├── analysis/           # AI Analysis page
│   │   ├── entities/           # Entity management
│   │   ├── graph/              # Relationship graph
│   │   ├── osint/              # OSINT tools
│   │   ├── reports/            # Intelligence reports
│   │   ├── search/             # Search page
│   │   ├── settings/           # Settings page
│   │   ├── tracking/           # Tracking links
│   │   └── t/[code]/           # Tracking redirect
│   ├── components/             # React components
│   │   ├── dashboard/          # Dashboard widgets
│   │   ├── layout/             # Layout components
│   │   └── ui/                 # UI primitives
│   ├── hooks/                  # Custom React hooks
│   └── lib/                    # Utilities & configs
│       ├── ai/                 # AI/ML utilities
│       ├── db/                 # Database schema & client
│       └── osint/              # OSINT platform data
├── drizzle/                    # Database migrations
├── public/                     # Static assets
└── ...config files
```

---

## 🔧 Configuration

### AI Configuration (Settings Page)

Navigate to **Settings** in the dashboard to configure:

#### Microsoft Foundry / Azure OpenAI
1. Go to [Azure AI Studio](https://ai.azure.com/)
2. Create an Azure OpenAI resource
3. Deploy a model (e.g., gpt-4, gpt-4o)
4. Copy:
   - **Endpoint**: Your resource endpoint
   - **API Key**: Your API key
   - **Deployment Name**: Your model deployment name

#### OpenAI Direct
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Enter in Settings

### OSINT API Keys

#### Investigative Agent — Search Providers (at least one required)

| Service | Purpose | Get Key | Env Var |
|---------|---------|---------|---------|
| Tavily | Social & web search (recommended) | [app.tavily.com](https://app.tavily.com/) | `TAVILY_API_KEY` |
| SerpAPI | Google search results | [serpapi.com](https://serpapi.com/manage-api-key) | `SERPAPI_API_KEY` |
| Bing Web Search | Microsoft Bing results | [Azure Portal](https://portal.azure.com/) | `BING_SEARCH_API_KEY` |

Set `SEARCH_PROVIDER=tavily|serpapi|bing` to force a specific provider. Otherwise, the first configured provider is used automatically.

#### Other OSINT Services

| Service | Purpose | Get Key |
|---------|---------|---------|
| Hunter.io | Email verification & intelligence | [hunter.io/api](https://hunter.io/api) |
| Shodan | Internet device intelligence | [developer.shodan.io](https://developer.shodan.io/) |
| VirusTotal | Malware & URL analysis | [virustotal.com](https://www.virustotal.com/gui/my-apikey) |
| Have I Been Pwned | Data breach lookup | [haveibeenpwned.com/API/Key](https://haveibeenpwned.com/API/Key) |
| IPInfo.io | IP geolocation | [ipinfo.io/account/token](https://ipinfo.io/account/token) |


---

## 📜 API Reference

### Entities API

```bash
# List entities
GET /api/entities?search=john&type=person&limit=20

# Create entity
POST /api/entities
{
  "name": "John Doe",
  "type": "person",
  "email": "john@example.com",
  "threatScore": 25
}

# Update entity
PUT /api/entities/[id]

# Delete entity
DELETE /api/entities/[id]
```

### OSINT Search API

```bash
# Username enumeration
POST /api/osint/search
{
  "searchType": "username",
  "query": "johndoe123"
}

# Email intelligence
POST /api/osint/search
{
  "searchType": "email",
  "query": "john@example.com"
}
```

### Tracking Links API

```bash
# Create tracking link
POST /api/tracking
{
  "name": "Twitter Campaign",
  "destinationUrl": "https://example.com"
}

# Get link details
GET /api/tracking/[code]
```

### AI Chat API

```bash
POST /api/chat
{
  "message": "Show me all high-risk entities",
  "conversationHistory": []
}
```

---

## 🔐 Security Considerations

⚠️ **Important**: This tool is designed for legitimate security research and threat intelligence purposes.

- Always obtain proper authorization before gathering intelligence
- Comply with local laws and platform terms of service
- Handle collected data responsibly and securely
- API keys are stored encrypted in the database
- Use HTTPS in production
- Implement rate limiting for production deployments

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

### Docker

```dockerfile
# Coming soon
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Neon](https://neon.tech/) - Serverless Postgres
- [Better Auth](https://www.better-auth.com/) - Authentication library
- [React Flow](https://reactflow.dev/) - Node-based graph visualization
- [Recharts](https://recharts.org/) - Charts library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS

---

<div align="center">
  <strong>Built with ❤️ for the security research community</strong>
</div>
