# Product Requirements Document (PRD)
# SEPTO - Threat Intelligence Dashboard

**Version:** 1.0.0  
**Date:** December 26, 2024  
**Status:** Active Development  
**Classification:** CONFIDENTIAL

---

## 🎯 Executive Summary

**SEPTO** (Security & Entity Profiling Threat Observatory) is an enterprise-grade Open Source Intelligence (OSINT) platform designed to aggregate, analyze, and visualize threat intelligence data. Built for security researchers, investigators, and intelligence analysts, Septo provides comprehensive entity profiling, relationship mapping, and AI-powered analysis capabilities.

### Vision Statement
*"To be the definitive intelligence platform that transforms fragmented digital footprints into actionable security insights."*

### Target Market
- Security Operations Centers (SOCs)
- Threat Intelligence Teams
- Private Investigators
- Law Enforcement Agencies
- Corporate Security Departments
- Red Team / Penetration Testing Firms

---

## 📋 Table of Contents

1. [Product Overview](#product-overview)
2. [Technology Stack](#technology-stack)
3. [Core Features](#core-features)
4. [System Architecture](#system-architecture)
5. [Database Schema](#database-schema)
6. [API Specifications](#api-specifications)
7. [UI/UX Design System](#uiux-design-system)
8. [Security Considerations](#security-considerations)
9. [Deployment Strategy](#deployment-strategy)
10. [Action Items & Milestones](#action-items--milestones)

---

## 🔍 Product Overview

### Problem Statement
Security analysts spend 60%+ of their time manually gathering and correlating data from disparate sources. Existing tools are fragmented, lack visual correlation capabilities, and don't leverage AI for intelligent analysis.

### Solution
Septo provides a unified intelligence platform that:
- Automates OSINT data collection across 15+ platforms
- Uses vector embeddings for semantic search across intelligence reports
- Visualizes entity relationships through interactive graph networks
- Generates AI-powered summaries and threat assessments
- Enables collaborative investigation workflows

### Key Differentiators
| Feature | Septo | Maltego | SpiderFoot |
|---------|-------|---------|------------|
| AI-Powered Analysis | ✅ | ❌ | ❌ |
| Vector Search | ✅ | ❌ | ❌ |
| Real-time Visualization | ✅ | ✅ | ❌ |
| Self-hosted Option | ✅ | ❌ | ✅ |
| Modern UI/UX | ✅ | ❌ | ❌ |

---

## 🛠 Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React Framework with App Router |
| React | 18.x | UI Library |
| TypeScript | 5.x | Type Safety |
| Tailwind CSS | 3.4.x | Utility-first Styling |
| React Flow | 11.x | Node Graph Visualization |
| Recharts | 2.x | Analytics Charts |
| Framer Motion | 11.x | Animations |
| Zustand | 4.x | State Management |
| React Query | 5.x | Server State Management |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 14.x | RESTful APIs |
| Drizzle ORM | 0.30.x | Database ORM |
| Zod | 3.x | Schema Validation |
| OpenAI SDK | 4.x | AI/Embeddings |

### Database
| Technology | Version | Purpose |
|------------|---------|---------|
| Neon PostgreSQL | Latest | Primary Database |
| pgvector | 0.5.x | Vector Search Extension |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Vercel | Hosting & Deployment |
| Neon | Serverless PostgreSQL |
| Azure AI Search | Image Recognition (Optional) |

---

## 🚀 Core Features

### F1: Intelligence Dashboard
**Priority:** P0 (Critical)

A grid-based command center displaying:
- **Recent Intelligence Reports** - Real-time feed of collected intelligence
- **Threat Metrics** - Key security indicators and trends
- **Active Investigations** - Ongoing case management
- **System Health** - Data collection status and alerts

### F2: Relationship Graph
**Priority:** P0 (Critical)

Interactive network visualization powered by React Flow:
- **Node Types:** Persons, Organizations, Domains, IPs, Emails, Phone Numbers
- **Edge Types:** Owns, Works At, Connected To, Mentioned In
- **Features:**
  - Drag-and-drop node positioning
  - Zoom and pan navigation
  - Node clustering for large datasets
  - Export to PNG/SVG
  - Filter by entity type

### F3: AI Analysis Panel
**Priority:** P0 (Critical)

Conversational interface for intelligence querying:
- Natural language database queries
- Semantic search using vector embeddings
- Auto-generated summaries of entities
- Threat assessment recommendations
- Citation of source data

### F4: Entity Management
**Priority:** P1 (High)

CRUD operations for intelligence entities:
- **Entity Types:**
  - Person (name, aliases, DOB, photo, social profiles)
  - Organization (name, industry, employees, locations)
  - Domain (registrar, DNS records, SSL info)
  - IP Address (geolocation, ASN, reputation)
  - Email (provider, associated accounts)
  - Phone (carrier, location, type)
  - Social Profile (platform, username, followers)
  - Credential (hashed password references)

### F5: Vector Search Engine
**Priority:** P0 (Critical)

Semantic search across all intelligence:
- OpenAI text-embedding-3-small for embeddings
- Cosine similarity matching
- Hybrid search (vector + full-text)
- Faceted filtering

### F6: OSINT Data Collection
**Priority:** P1 (High)

Automated intelligence gathering:
- **Social Media Crawlers:**
  - Username enumeration across platforms
  - Profile data extraction
  - Post/activity timeline
- **Technical Reconnaissance:**
  - WHOIS lookups
  - DNS enumeration
  - SSL certificate analysis
  - Shodan integration
- **People Search:**
  - Email to social profile correlation
  - Phone number lookup
  - Address verification

### F7: Tracking & Attribution
**Priority:** P2 (Medium)

Generate tracking pixels and URLs:
- IP address logging
- Device fingerprinting
- Geolocation estimation
- Browser/OS identification
- Click tracking analytics

### F8: Photo Recognition
**Priority:** P2 (Medium)

Reverse image search capabilities:
- Face detection and encoding
- Cross-platform image matching
- Photo metadata extraction (EXIF)

### F9: Report Generation
**Priority:** P2 (Medium)

Export intelligence in multiple formats:
- PDF dossiers
- JSON/CSV data export
- Timeline visualizations
- Executive summaries

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SEPTO ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Browser    │    │   Mobile     │    │    API       │      │
│  │   Client     │    │   Client     │    │   Clients    │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Next.js App Router                     │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │  │
│  │  │   Pages    │  │   API      │  │   Server Actions   │  │  │
│  │  │   (RSC)    │  │   Routes   │  │                    │  │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐               │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌────────────┐     ┌────────────┐      ┌────────────┐         │
│  │  Drizzle   │     │   OpenAI   │      │  External  │         │
│  │    ORM     │     │    API     │      │   APIs     │         │
│  └─────┬──────┘     └────────────┘      └────────────┘         │
│        │                                                        │
│        ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Neon PostgreSQL                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │  │
│  │  │ Entities │  │ Vectors  │  │  Reports │               │  │
│  │  │  Tables  │  │ (pgvec)  │  │          │               │  │
│  │  └──────────┘  └──────────┘  └──────────┘               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### Core Tables

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Entities: Core intelligence subjects
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- person, organization, domain, ip, email, phone
    name VARCHAR(255) NOT NULL,
    aliases TEXT[],
    metadata JSONB DEFAULT '{}',
    threat_score INTEGER DEFAULT 0 CHECK (threat_score >= 0 AND threat_score <= 100),
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Entity Relationships
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    target_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL, -- owns, works_at, connected_to, mentioned_in
    confidence DECIMAL(3,2) DEFAULT 1.00,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Intelligence Reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(255),
    source_url TEXT,
    severity VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
    tags TEXT[],
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Social Profiles
CREATE TABLE social_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- twitter, instagram, facebook, linkedin, etc.
    username VARCHAR(255) NOT NULL,
    profile_url TEXT,
    display_name VARCHAR(255),
    bio TEXT,
    followers INTEGER DEFAULT 0,
    following INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    profile_image_url TEXT,
    raw_data JSONB DEFAULT '{}',
    last_scraped TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tracking Pixels/URLs
CREATE TABLE tracking_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_code VARCHAR(20) UNIQUE NOT NULL,
    target_url TEXT NOT NULL,
    entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tracking Events
CREATE TABLE tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID REFERENCES tracking_links(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    clicked_at TIMESTAMP DEFAULT NOW()
);

-- Investigation Cases
CREATE TABLE investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open', -- open, in_progress, closed
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    assigned_to VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Investigation Entity Links
CREATE TABLE investigation_entities (
    investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    notes TEXT,
    added_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (investigation_id, entity_id)
);

-- AI Chat History
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_threat_score ON entities(threat_score);
CREATE INDEX idx_relationships_source ON relationships(source_id);
CREATE INDEX idx_relationships_target ON relationships(target_id);
CREATE INDEX idx_reports_embedding ON reports USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_reports_severity ON reports(severity);
CREATE INDEX idx_social_profiles_entity ON social_profiles(entity_id);
CREATE INDEX idx_social_profiles_platform ON social_profiles(platform);
CREATE INDEX idx_tracking_events_link ON tracking_events(link_id);
CREATE INDEX idx_chat_session ON chat_messages(session_id);
```

---

## 🔌 API Specifications

### Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entities` | List all entities |
| POST | `/api/entities` | Create new entity |
| GET | `/api/entities/:id` | Get entity details |
| PATCH | `/api/entities/:id` | Update entity |
| DELETE | `/api/entities/:id` | Delete entity |
| GET | `/api/entities/:id/graph` | Get entity relationship graph |
| POST | `/api/search` | Vector search across reports |
| POST | `/api/chat` | AI analysis chat |
| GET | `/api/reports` | List intelligence reports |
| POST | `/api/reports` | Create new report |
| POST | `/api/osint/lookup` | Perform OSINT lookup |
| POST | `/api/tracking/create` | Generate tracking link |
| GET | `/api/tracking/:code` | Redirect and log tracking |
| GET | `/api/analytics/dashboard` | Get dashboard metrics |

### Request/Response Examples

#### Vector Search
```json
// POST /api/search
{
  "query": "Russian APT groups targeting financial institutions",
  "limit": 10,
  "filters": {
    "severity": ["high", "critical"],
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  }
}

// Response
{
  "results": [
    {
      "id": "uuid",
      "title": "APT28 Campaign Analysis",
      "content": "...",
      "similarity": 0.92,
      "severity": "critical"
    }
  ],
  "total": 42,
  "query_embedding_time": 120,
  "search_time": 45
}
```

---

## 🎨 UI/UX Design System

### Color Palette

```css
:root {
  /* Base Colors */
  --color-void: #050505;
  --color-obsidian: #0a0a0a;
  --color-carbon: #111111;
  --color-graphite: #1a1a1a;
  --color-slate: #2a2a2a;
  
  /* Accent - Cyber Green */
  --color-matrix: #00ff41;
  --color-matrix-dim: #00cc33;
  --color-matrix-glow: rgba(0, 255, 65, 0.4);
  
  /* Secondary Accents */
  --color-electric: #00d4ff;
  --color-warning: #ff9500;
  --color-critical: #ff3b3b;
  --color-safe: #00ff88;
  
  /* Glass Effects */
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-blur: blur(20px);
  
  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #888888;
  --text-muted: #555555;
}
```

### Typography

```css
/* Primary Font - Display & Headers */
@font-face {
  font-family: 'Geist';
  /* Modern, clean sans-serif */
}

/* Monospace - Data & Code */
@font-face {
  font-family: 'JetBrains Mono';
  /* Technical data display */
}

/* Font Scale */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 2rem;      /* 32px */
--text-4xl: 2.5rem;    /* 40px */
```

### Glassmorphism Components

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.glass-panel-hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-panel-hover:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(0, 255, 65, 0.2);
  box-shadow: 
    0 12px 48px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(0, 255, 65, 0.1);
}
```

### Animation Guidelines

1. **Page Load Sequence:**
   - Staggered fade-in with 50ms delays
   - Slide up from 20px with opacity
   - Duration: 600ms ease-out

2. **Micro-interactions:**
   - Button hover: scale(1.02), 150ms
   - Card hover: translateY(-4px), glow effect
   - Focus states: ring animation

3. **Data Updates:**
   - Number counters: count-up animation
   - Graph updates: smooth transitions
   - New data: subtle pulse effect

---

## 🔒 Security Considerations

### Data Protection
- All PII encrypted at rest using AES-256
- Row-level security in PostgreSQL
- API rate limiting (100 req/min per IP)
- JWT-based authentication
- CORS whitelisting

### Compliance
- GDPR data handling procedures
- Audit logging for all data access
- Data retention policies (configurable)
- Right to deletion implementation

### Ethical Guidelines
- Clear terms of service for data collection
- No scraping of private/protected content
- Rate limiting to prevent platform abuse
- Disclaimer for investigative use only

---

## 📦 Deployment Strategy

### Environment Setup
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/septo?sslmode=require

# OpenAI
OPENAI_API_KEY=sk-...

# Application
NEXT_PUBLIC_APP_URL=https://septo.app
NODE_ENV=production

# Optional Integrations
SHODAN_API_KEY=...
HUNTER_API_KEY=...
```

### CI/CD Pipeline
1. Push to `main` → Vercel Preview
2. Automated tests pass
3. Manual approval for production
4. Automatic Neon DB migrations

---

## ✅ Action Items & Milestones

### Phase 1: Foundation (Week 1-2)
- [x] Create PRD document
- [ ] Initialize Next.js 14+ project
- [ ] Configure Tailwind CSS with custom theme
- [ ] Set up Drizzle ORM with Neon DB
- [ ] Create database schema and migrations
- [ ] Implement base layout and navigation

### Phase 2: Core UI (Week 2-3)
- [ ] Build glassmorphism component library
- [ ] Create dashboard grid layout
- [ ] Implement sidebar navigation
- [ ] Build entity cards and tables
- [ ] Add loading states and skeletons

### Phase 3: Data Layer (Week 3-4)
- [ ] Implement entity CRUD APIs
- [ ] Set up vector search with pgvector
- [ ] Integrate OpenAI embeddings
- [ ] Build report management system
- [ ] Create relationship graph data layer

### Phase 4: Visualization (Week 4-5)
- [ ] Implement React Flow graph component
- [ ] Build Recharts analytics widgets
- [ ] Create threat timeline view
- [ ] Add interactive filters
- [ ] Export functionality

### Phase 5: AI Features (Week 5-6)
- [ ] Build AI chat interface
- [ ] Implement semantic search
- [ ] Add auto-summarization
- [ ] Create threat scoring algorithm

### Phase 6: OSINT Tools (Week 6-8)
- [ ] Username enumeration module
- [ ] Social profile scrapers
- [ ] Domain/IP reconnaissance
- [ ] Tracking link generator
- [ ] Photo analysis integration

### Phase 7: Polish & Launch (Week 8-9)
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] Beta testing
- [ ] Production deployment

---

## 📚 Appendix

### Reference Tools & Inspiration
- Maltego - Graph-based intelligence
- SpiderFoot - OSINT automation
- Sherlock - Username enumeration
- Holehe - Email to account lookup
- Shodan - Internet device search
- Hunter.io - Email finding
- theHarvester - Subdomain/email gathering

### Potential Integrations
- VirusTotal API
- Shodan API
- Hunter.io API
- Have I Been Pwned API
- IPinfo API
- Social media official APIs

---

*This document is a living specification and will be updated as the project evolves.*

**Last Updated:** December 26, 2024  
**Document Owner:** Septo Development Team

