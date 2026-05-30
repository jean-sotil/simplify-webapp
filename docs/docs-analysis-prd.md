# 📋 Product Requirements Document (PRD)
## **Intelligent Document Analysis Platform — Docs Analysis Module**
**Version:** 1.0  
**Status:** Pre-Launch POC  
**Client:** [Enterprise Client - Elite Infrastructure]  
**Prepared by:** ibudi — AI-Powered Web Infrastructure  
**Date:** May 2026

---

## Executive Summary

We are building a **Proof of Concept (POC)** for an intelligent project management and document analysis platform that unifies project lifecycle management with AI-powered document intelligence. 

The MVP (14-day deployment) focuses on two core modules:

1. **Projects Module** — centralized project registry with pipeline stages and metadata management
2. **Documents Module** — a searchable knowledge base that supports two critical document types:
   - **ETT (Engineering Technical Specification)** — primary specification documents
   - **Hardware Inventory** — equipment and asset documentation

**Key Innovation:** When a project enters the "Docs Analysis" phase, the system automatically extracts requirements from the project's ETT, semantically searches the knowledge base for related documents, and orchestrates an n8n workflow that generates a comprehensive analysis report with actionable recommendations.

**Success Metrics (14-day POC):**
- ✅ Projects CRUD with pipeline stage management
- ✅ Document upload with LLM-optimized conversion & vector embeddings
- ✅ Multi-project document linking (documents used across projects)
- ✅ Analysis trigger → n8n workflow integration
- ✅ Requirement extraction from ETT + semantic document matching
- ✅ Full SEO, accessibility (WCAG 2.1 AA), and i18n support (EN/ES)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Core Modules](#core-modules)
4. [Technical Architecture](#technical-architecture)
5. [Technology Stack & Rationale](#technology-stack--rationale)
6. [Data Models](#data-models)
7. [API Design](#api-design)
8. [AI/LLM Integration Strategy](#aillm-integration-strategy)
9. [Workflow: From Document Upload to Analysis](#workflow)
10. [SEO, Accessibility & Internationalization](#seo-accessibility--internationalization)
11. [Development Roadmap (14-day POC)](#development-roadmap-14-day-poc)
12. [Success Criteria & Metrics](#success-criteria--metrics)

---

## Problem Statement

**Current State:**
- Projects are scattered across multiple tools (project mgmt, spreadsheets, email chains)
- Document requirements are manually tracked; no central source of truth
- Analysis phase requires hours of manual document review and cross-referencing
- No semantic understanding of which documents relate to which project requirements
- Decision-making is slow because knowledge discovery is manual and fragmented

**Business Impact:**
- 15–20 hours wasted per project on manual document review
- Risk of incomplete or incorrect requirement coverage
- Inconsistent analysis quality across team members
- Missed opportunities to reuse institutional knowledge

**Solution Opportunity:**
- **Unified Platform:** Single source of truth for projects and documents
- **Intelligent Analysis:** AI extracts requirements and finds related documents automatically
- **Workflow Automation:** n8n orchestrates the entire analysis → reduce time from hours to minutes
- **Knowledge Leverage:** Documents linked across projects; reusable institutional memory
- **Auditability:** Every decision documented and traceable

---

## Solution Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Full-Stack App                    │
│  (Server Components, Server Actions, App Router)            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  Projects Module │  │ Documents Module │                 │
│  │  - Create/Edit   │  │ - Upload & Parse │                 │
│  │  - Stages        │  │ - Type: ETT      │                 │
│  │  - Analytics     │  │ - Type: Hardware │                 │
│  │  - Attach Docs   │  │ - Vector Embed   │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │         Analysis Module (Key Feature)            │       │
│  │  1. Trigger analysis on project                  │       │
│  │  2. Extract ETT requirements (LLM)               │       │
│  │  3. Semantic search documents (embeddings)       │       │
│  │  4. Send to n8n workflow                         │       │
│  │  5. Generate report with recommendations         │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    Database Layer                           │
│  ┌──────────────────┐  ┌──────────────────────────┐         │
│  │  Supabase (PG)   │  │   Vector Database        │         │
│  │  - Projects      │  │   (pgvector in Supabase) │         │
│  │  - Documents     │  │   - Document embeddings  │         │
│  │  - Users         │  │   - Semantic search      │         │
│  │  - Audit logs    │  │                          │         │
│  └──────────────────┘  └──────────────────────────┘         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                External Integrations                         │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   Payload CMS    │  │  n8n Workflow    │                 │
│  │ (Content mgmt)   │  │ (Orchestration)  │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  OpenAI GPT-4    │  │  Vercel Blob     │                 │
│  │ (LLM analysis)   │  │ (File storage)   │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Modules

### 1. Projects Module

**Purpose:** Centralized project registry with stage-based pipeline and document attachment.

**Key Features:**
- **Create/Edit/Delete** projects with metadata (name, description, owner, team)
- **Pipeline Stages:**
  - Initiation
  - Planning
  - **Docs Analysis** ← Key trigger for AI analysis
  - Development
  - Deployment
  - Completed
- **Attach Documents** to project (many-to-many relationship)
  - Select ETT documents
  - Select Hardware inventory documents
  - Dynamically updated knowledge base
- **Analytics Dashboard**
  - Total projects by stage
  - Documents per project
  - Last analysis timestamp
  - Requirements coverage %
- **Audit Trail** — track all actions (created, modified, analysis triggered)

**Data Fields:**
```typescript
interface Project {
  id: string
  name: string
  description: string
  ownerId: string
  teamId: string
  stage: ProjectStage // "initiation" | "planning" | "docs_analysis" | ...
  createdAt: timestamp
  updatedAt: timestamp
  attachedDocuments: Document[] // m2m relationship
  analysisResults?: AnalysisResult
  metadata: Record<string, unknown>
}
```

### 2. Documents Module

**Purpose:** Intelligent document repository with dual-format storage and semantic indexing.

**Key Features:**
- **Upload Documents** (ETT specs, Hardware inventory)
- **Automatic Processing:**
  1. Store original file in Vercel Blob
  2. Extract text & structure
  3. Optimize for LLM (clean formatting, sections, tables)
  4. Generate embeddings via OpenAI API
  5. Store vectors in Supabase pgvector
- **Document Types:**
  - **ETT (Engineering Technical Specification)** — primary spec; structured into sections (requirements, constraints, architecture, etc.)
  - **Hardware Inventory** — asset lists with specs; tokenized for semantic search
- **Knowledge Base Graph:**
  - Documents tagged by category
  - Cross-referenced to projects
  - Embeddings enable semantic search ("What documents contain antenna specifications?")
- **Versioning** — track document versions; always link latest to projects
- **Search & Filtering:**
  - Full-text search on document content
  - Semantic search (vector similarity)
  - Filter by type, team, creation date

**Data Fields:**
```typescript
interface Document {
  id: string
  filename: string
  documentType: "ett" | "hardware"
  originalFileUrl: string // Vercel Blob
  extractedText: string
  llmOptimizedContent: string
  embedding: number[] // OpenAI vector (1536 dimensions)
  metadata: {
    category?: string
    version?: string
    source?: string
    lastModified?: timestamp
  }
  teamId: string
  uploadedBy: string
  uploadedAt: timestamp
  relatedProjects: Project[] // m2m
}
```

### 3. Analysis Module (Orchestration Layer)

**Purpose:** Trigger intelligent document analysis via n8n workflow.

**Workflow Steps:**
1. **Requirement Extraction** — LLM reads project's ETT, extracts structured requirements list
2. **Semantic Search** — For each requirement, query embeddings database to find related documents
3. **Document Aggregation** — Collect URLs and metadata of matching documents
4. **n8n Orchestration** — Send to external workflow with:
   - Project metadata
   - Requirement list
   - Document URLs
   - Analysis context
5. **Report Generation** — Workflow returns analysis report, stored in project

**Trigger:** User clicks "Run Analysis" on project in "Docs Analysis" stage

---

## Technical Architecture

### Application Structure (Next.js App Router)

```
project-root/
├── app/
│   ├── layout.tsx                    # Root layout w/ metadata & i18n provider
│   ├── [lang]/                       # Dynamic locale segment
│   │   ├── layout.tsx                # Locale-aware layout
│   │   ├── page.tsx                  # Dashboard / home
│   │   ├── projects/
│   │   │   ├── page.tsx              # Projects list (RSC)
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx          # Project detail
│   │   │   │   ├── analysis/
│   │   │   │   │   ├── page.tsx      # Analysis view
│   │   │   │   │   └── actions.ts    # Server Action: trigger analysis
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx      # Project editor
│   │   │   └── actions.ts            # Server Actions: CRUD
│   │   ├── documents/
│   │   │   ├── page.tsx              # Documents knowledge base
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx          # Document detail + preview
│   │   │   └── actions.ts            # Server Actions: upload, search
│   │   └── not-found.tsx             # 404 for locale routes
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── n8n/route.ts          # n8n webhook receiver (analysis results)
│   │   ├── search/
│   │   │   └── route.ts              # Semantic search endpoint
│   │   └── health/
│   │       └── route.ts              # Health check
│   ├── robots.ts                     # SEO: robots.txt via metadata
│   └── sitemap.ts                    # SEO: dynamic sitemap
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── projects/
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectForm.tsx           # 'use client'
│   │   ├── ProjectPipeline.tsx
│   │   └── AnalysisTrigger.tsx       # 'use client'
│   ├── documents/
│   │   ├── DocumentUploader.tsx      # 'use client' (file input)
│   │   ├── DocumentPreview.tsx
│   │   ├── DocumentSearch.tsx        # 'use client' (real-time search)
│   │   └── DocumentCard.tsx
│   ├── layout/
│   │   ├── Navigation.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── common/
│   │   ├── LanguageSwitcher.tsx      # i18n toggle
│   │   ├── JsonLd.tsx                # SEO: JSON-LD renderer
│   │   └── AccessibilitySkipLink.tsx
│   └── ErrorBoundary.tsx             # Error handling
├── lib/
│   ├── db.ts                         # Supabase client (server)
│   ├── ai/
│   │   ├── openai.ts                 # OpenAI API wrapper (embeddings, extraction)
│   │   └── extraction.ts             # Requirement extraction logic
│   ├── search/
│   │   └── semantic.ts               # Vector search queries
│   ├── n8n/
│   │   └── client.ts                 # n8n webhook client
│   ├── validation/
│   │   └── schemas.ts                # Zod schemas for all data
│   ├── i18n/
│   │   ├── routing.ts                # Locale routing logic
│   │   ├── messages.ts               # Translation strings
│   │   └── middleware.ts             # i18n middleware
│   └── utils/
│       ├── file.ts                   # File processing
│       ├── formatting.ts             # Display utilities
│       └── seo.ts                    # SEO helpers
├── middleware.ts                     # i18n & auth middleware
├── public/
│   ├── fonts/                        # next/font optimized
│   ├── og-images/                    # Open Graph images
│   └── sitemap.xml                   # Static fallback
├── styles/
│   ├── globals.css                   # Tailwind + custom CSS
│   └── variables.css                 # Design tokens
├── .env.local                        # Secrets
├── next.config.ts                    # Next.js config
├── tsconfig.json                     # TypeScript strict mode
├── tailwind.config.ts                # Tailwind + accessibility
├── playwright.config.ts              # E2E test config
└── package.json
```

---

## Technology Stack & Rationale

### Frontend Framework
**Next.js 15+ (App Router)**
- ✅ Server Components by default (reduces JS bundle, improves FCP/LCP)
- ✅ Server Actions for form submission (no separate API routes for mutations)
- ✅ Built-in metadata API (SEO, OG tags, JSON-LD)
- ✅ Parallel Routes for independent loading states (analysis + documents panel)
- ✅ Streaming + Suspense for progressive rendering
- ✅ Image optimization (`next/image` for CLS, webp conversion)
- ✅ Font optimization (`next/font` prevents FOIT/FOUT)
- ✅ Automatic sitemap generation

**Why NOT Pages Router:** App Router's Server Components eliminate hydration cost and allow direct DB access; this is non-negotiable for 2025+.

---

### Styling & UI
**Tailwind CSS + shadcn/ui**
- ✅ Utility-first approach for rapid iteration
- ✅ shadcn/ui provides battle-tested Radix primitives (Dialog, Combobox, Popover, Tabs)
- ✅ Radix ensures WCAG 2.1 AA compliance by default (focus management, ARIA roles)
- ✅ Dark mode support via CSS variables
- ✅ Custom design tokens (colors, spacing, typography)

**Color System (Enterprise-ready):**
- Primary: `#0f766e` (teal — trust, intelligence)
- Secondary: `#1e40af` (blue — reliability)
- Accent: `#ea580c` (orange — action, energy)
- Neutral: Gray scale for content hierarchy
- Status: Green (success), Red (error), Yellow (warning), Blue (info)

---

### Database
**Supabase (PostgreSQL + pgvector)**
- ✅ Relational data (projects, documents, users) in PostgreSQL
- ✅ Built-in pgvector extension for semantic search on embeddings
- ✅ Row-level security (RLS) policies for multi-tenant isolation
- ✅ Realtime subscriptions (optional; for live updates)
- ✅ Auth integration (JWT-based sessions via Supabase Auth)
- ✅ Backups + PIT recovery
- ✅ Prisma ORM support (strict type safety)

**Why NOT MongoDB:** We need relational integrity (m2m relationships), ACID compliance, and vector search — PostgreSQL + pgvector is the gold standard.

---

### State Management & Data Fetching
**React Query (TanStack Query v5)**
- ✅ Server state management for remote data (projects, documents)
- ✅ Automatic background refetching + revalidation
- ✅ Optimistic updates (user sees change instantly)
- ✅ Infinite queries for pagination
- ✅ Devtools for debugging

**URL State via `useSearchParams`**
- Filters, sorting, pagination live in the URL
- Free shareability and deep-linking
- Works with Server Components

**Never Use localStorage for sensitive data** → Use httpOnly cookies set by Server Actions instead.

---

### Content Management
**Payload CMS**
- ✅ Headless CMS for marketing content (blog posts, help docs)
- ✅ Collections API for flexible content types
- ✅ Admin dashboard for non-technical team members
- ✅ Draft/published workflow
- ✅ Rich text editor + media library
- ✅ Webhooks for integrations

**Separation of Concerns:**
- Payload CMS = Marketing + Help Content
- Next.js App = Core product (projects, documents, analysis)
- Separate apps; Payload exposes REST API to Next.js

---

### File Storage
**Vercel Blob Storage**
- ✅ Optimized for Next.js (zero config)
- ✅ Atomic uploads (no partial/corrupted files)
- ✅ CDN delivery (fast, global)
- ✅ Per-file retention policies
- ✅ Automatic cleanup (set expiration on analysis PDFs)
- ✅ Server-side only (no exposing URLs in client code)

**Flow:**
1. User uploads file in browser
2. Server Action streams to Vercel Blob
3. Return blob URL
4. Store URL in Supabase document record

---

### AI & Embeddings
**OpenAI API (GPT-4 + Embeddings)**

**For Requirement Extraction:**
- Model: `gpt-4-turbo` (context window 128k, structured outputs)
- Input: Project ETT + project metadata
- Output: Structured JSON list of requirements with priority/category
- Prompt engineering: Zero-shot with examples in system prompt

**For Embeddings (Semantic Search):**
- Model: `text-embedding-3-large` (1536 dimensions, state-of-the-art)
- Triggers: When document uploaded, or when requirement extracted
- Storage: pgvector in Supabase
- Query: Cosine similarity search (top-5 most relevant documents)

**Cost Optimization:**
- Cache embeddings (don't regenerate per search)
- Batch requirement extraction (send multiple projects in one API call)
- Use cheaper models for non-critical tasks (e.g., `gpt-3.5-turbo` for summaries)

---

### Workflow Orchestration
**n8n (Self-hosted or Cloud)**

**Why n8n?**
- ✅ No-code/low-code workflow builder (non-technical team can modify)
- ✅ 200+ integrations (tools, APIs, webhooks)
- ✅ Conditional logic, loops, error handling
- ✅ Webhook receivers (n8n listens for requests from Next.js)
- ✅ Ability to call external APIs (custom tools)
- ✅ Audit logs for compliance

**Workflow Template:**
```
Start (Webhook from Next.js)
  ↓
[1] Receive project metadata + requirements + document URLs
  ↓
[2] For each requirement:
    - Look up document by URL
    - Extract relevant section
    - Store in temp object
  ↓
[3] Call OpenAI API to generate analysis (structured prompt)
  ↓
[4] Format results into PDF/markdown
  ↓
[5] Store analysis report
  ↓
[6] Webhook back to Next.js to update project.analysisResults
  ↓
[End] Emit success event (triggers UI refresh)
```

---

### TypeScript & Validation
**TypeScript (Strict Mode)**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "strictBindCallApply": true
  }
}
```

**Zod for Runtime Validation**
- Validate all form inputs before Server Action
- Validate API responses before using
- Co-locate schemas with code
- Infer types: `type FormData = z.infer<typeof FormSchema>`

---

### Testing
**React Testing Library (Unit & Component Tests)**
- Test behavior, not implementation
- Focus on accessibility (test via keyboard, screen reader)
- Example: Test form submission sets focus on error message

**Playwright (E2E Tests)**
- Critical user journeys (upload document, create project, trigger analysis)
- Run in CI/CD before deployment
- Visual regression testing (Playwright Screenshots)

---

### SEO, Accessibility & Internationalization

#### SEO
- **Metadata API:** `generateMetadata` per route
- **JSON-LD:** Organization, BreadcrumbList, FAQPage schemas
- **Dynamic Sitemap:** `sitemap.ts` generates all routes (projects, documents, locales)
- **Open Graph:** Every page has OG image (generated or manual)
- **Canonical URLs:** Prevents duplicate content issues
- **Hreflang Tags:** EN/ES localization signals to search engines
- **Core Web Vitals:** LCP <2.5s, INP <200ms, CLS <0.1 (via next/image, next/font, Suspense)

#### Accessibility (WCAG 2.1 AA)
- **Semantic HTML:** `<main>`, `<nav>`, `<article>`, `<section>`
- **Headings in Order:** No skipped levels
- **Form Labels:** Every input has associated `<label>` or `aria-label`
- **Focus Management:** Visible focus outlines (Tailwind `focus:ring-2`)
- **Color Contrast:** 4.5:1 min ratio for text
- **Keyboard Navigation:** Tab through all interactive elements
- **ARIA Attributes:** `aria-label`, `aria-describedby`, `aria-live` for dynamic updates
- **Alt Text:** Descriptive alt on all images (no "image.png")
- **Skip Navigation Link:** Keyboard users can skip to main content
- **Screen Reader Support:** Test with NVDA (Windows), JAWS, VoiceOver (Mac)

#### Internationalization (i18n)
- **Framework:** `next-intl` or `next-i18n-routing`
- **Locale Routing:** `/en/projects`, `/es/projects`
- **Dynamic Metadata:** Title/description translated per route
- **Server-side:** Locale resolved in middleware, passed to components
- **Database:** Store `locale` preference in user profile
- **Translation Strings:**
  ```typescript
  // lib/i18n/messages/en.json
  {
    "projects.title": "Projects",
    "documents.upload": "Upload Document",
    ...
  }
  ```

---

## Data Models

### ER Diagram (Simplified)

```
┌──────────────────┐
│     Users        │
├──────────────────┤
│ id (PK)          │
│ email            │
│ name             │
│ teamId (FK)      │
│ locale           │
│ createdAt        │
└──────────────────┘
         │
         │ 1:N
         ↓
┌──────────────────┐
│      Teams       │
├──────────────────┤
│ id (PK)          │
│ name             │
│ createdAt        │
└──────────────────┘
         │
         ├─ 1:N ─→ ┌──────────────────┐
         │         │    Projects      │
         │         ├──────────────────┤
         │         │ id (PK)          │
         │         │ name             │
         │         │ description      │
         │         │ stage            │
         │         │ teamId (FK)      │
         │         │ ownerId (FK)     │
         │         │ analysisResults  │
         │         │ createdAt        │
         │         │ updatedAt        │
         │         └──────────────────┘
         │                  │
         │                  ├─ M:M ─→ ┌──────────────────┐
         │                  │         │   Documents      │
         │                  │         ├──────────────────┤
         │                  │         │ id (PK)          │
         │                  │         │ filename         │
         │                  │         │ documentType     │
         │                  │         │ originalFileUrl  │
         │                  │         │ extractedText    │
         │                  │         │ llmOptimizedText │
         │                  │         │ embedding        │
         │                  │         │ teamId (FK)      │
         │                  │         │ uploadedBy (FK)  │
         │                  │         │ uploadedAt       │
         │                  │         └──────────────────┘
         │                  │
         │                  └─ 1:1 ──→ ┌──────────────────┐
         │                             │ AnalysisResult   │
         │                             ├──────────────────┤
         │                             │ id (PK)          │
         │                             │ projectId (FK)   │
         │                             │ requirementsList │
         │                             │ documentMatches  │
         │                             │ reportUrl        │
         │                             │ triggeredAt      │
         │                             │ completedAt      │
         │                             └──────────────────┘
         │
         └─ 1:N ─→ ┌──────────────────────────┐
                  │   AuditLog               │
                  ├──────────────────────────┤
                  │ id (PK)                  │
                  │ userId (FK)              │
                  │ action                   │
                  │ resourceType             │
                  │ resourceId               │
                  │ changes (JSON)           │
                  │ timestamp                │
                  └──────────────────────────┘
```

### Key Tables Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  team_id UUID REFERENCES teams(id),
  locale TEXT DEFAULT 'en',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  stage TEXT NOT NULL DEFAULT 'initiation',
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id),
  analysis_results_id UUID REFERENCES analysis_results(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_stage CHECK (stage IN ('initiation', 'planning', 'docs_analysis', 'development', 'deployment', 'completed'))
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  document_type TEXT NOT NULL,
  original_file_url TEXT NOT NULL,
  extracted_text TEXT,
  llm_optimized_content TEXT,
  embedding vector(1536), -- OpenAI embedding
  metadata JSONB,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_doc_type CHECK (document_type IN ('ett', 'hardware'))
);

-- Junction table: Projects <-> Documents (M:M)
CREATE TABLE project_documents (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, document_id)
);

-- Analysis Results
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  requirements_list JSONB NOT NULL, -- Array of requirements
  document_matches JSONB NOT NULL, -- Array of { requirement_id, matched_docs }
  report_url TEXT, -- URL to PDF/markdown report
  triggered_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, failed
  error_message TEXT
);

-- Audit Log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- created, updated, deleted, analyzed
  resource_type TEXT NOT NULL, -- project, document, analysis
  resource_id UUID NOT NULL,
  changes JSONB, -- What changed (before/after)
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_team_id ON projects(team_id);
CREATE INDEX idx_projects_stage ON projects(stage);
CREATE INDEX idx_documents_team_id ON documents(team_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_analysis_project_id ON analysis_results(project_id);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);

-- Vector search index
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops);
```

---

## API Design

### Server Actions (Mutations)

**Server Actions** handle mutations instead of traditional API routes. They run on the server, validate with Zod, and integrate directly with Supabase.

#### Projects

```typescript
// app/[lang]/projects/actions.ts

'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { ProjectSchema, CreateProjectSchema } from '@/lib/validation/schemas'
import { getSession } from '@/lib/auth'

// Create Project
export async function createProject(formData: FormData) {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData)
  const parsed = CreateProjectSchema.parse(rawData)

  const project = await db
    .from('projects')
    .insert({
      name: parsed.name,
      description: parsed.description,
      team_id: session.user.team_id,
      owner_id: session.user.id,
      stage: 'initiation',
    })
    .select()
    .single()

  revalidatePath('/[lang]/projects', 'page')
  return project
}

// Update Project
export async function updateProject(id: string, formData: FormData) {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData)
  const parsed = ProjectSchema.parse(rawData)

  const project = await db
    .from('projects')
    .update({ ...parsed, updated_at: new Date() })
    .eq('id', id)
    .select()
    .single()

  revalidatePath(`/[lang]/projects/${id}`, 'page')
  return project
}

// Change Stage
export async function updateProjectStage(
  projectId: string,
  newStage: ProjectStage
) {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const project = await db
    .from('projects')
    .update({
      stage: newStage,
      updated_at: new Date(),
    })
    .eq('id', projectId)
    .select()
    .single()

  revalidatePath(`/[lang]/projects/${projectId}`, 'page')
  
  // Log audit event
  await db.from('audit_logs').insert({
    user_id: session.user.id,
    action: 'updated',
    resource_type: 'project',
    resource_id: projectId,
    changes: { stage: newStage },
  })

  return project
}

// Attach Document to Project
export async function attachDocumentToProject(
  projectId: string,
  documentId: string
) {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  await db.from('project_documents').insert({
    project_id: projectId,
    document_id: documentId,
  })

  revalidatePath(`/[lang]/projects/${projectId}`, 'page')
}
```

#### Documents

```typescript
// app/[lang]/documents/actions.ts

'use server'

import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { extractTextFromPdf, convertToLlmOptimized } from '@/lib/file'
import { generateEmbedding } from '@/lib/ai/openai'
import { getSession } from '@/lib/auth'

export async function uploadDocument(formData: FormData) {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const file = formData.get('file') as File
  const docType = formData.get('documentType') as 'ett' | 'hardware'

  if (!file || !docType) throw new Error('Missing file or type')

  // 1. Upload original file to Vercel Blob
  const blob = await put(`documents/${Date.now()}-${file.name}`, file, {
    access: 'private',
    addRandomSuffix: true,
  })

  // 2. Extract text from PDF
  const extractedText = await extractTextFromPdf(file)

  // 3. Convert to LLM-optimized format
  const llmOptimizedContent = convertToLlmOptimized(extractedText)

  // 4. Generate embedding via OpenAI
  const embedding = await generateEmbedding(llmOptimizedContent)

  // 5. Store in Supabase
  const document = await db
    .from('documents')
    .insert({
      filename: file.name,
      document_type: docType,
      original_file_url: blob.url,
      extracted_text: extractedText,
      llm_optimized_content: llmOptimizedContent,
      embedding,
      team_id: session.user.team_id,
      uploaded_by: session.user.id,
    })
    .select()
    .single()

  return document
}

// Semantic Search Documents
export async function searchDocuments(
  query: string,
  documentType?: 'ett' | 'hardware'
) {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query)

  // Search with vector similarity (cosine distance)
  let q = db
    .from('documents')
    .select('id, filename, document_type, embedding, metadata')
    .eq('team_id', session.user.team_id)
    .order('embedding', {
      operator: 'cosine_distance_op',
      ascending: true,
    })
    .limit(10)

  if (documentType) {
    q = q.eq('document_type', documentType)
  }

  const { data, error } = await q
  if (error) throw error
  return data
}
```

#### Analysis Trigger

```typescript
// app/[lang]/projects/[id]/analysis/actions.ts

'use server'

import { db } from '@/lib/db'
import { extractRequirements } from '@/lib/ai/extraction'
import { semanticSearchDocuments } from '@/lib/search/semantic'
import { triggerN8nWorkflow } from '@/lib/n8n/client'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function triggerAnalysis(projectId: string) {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  // 1. Fetch project & attached documents
  const project = await db
    .from('projects')
    .select(
      `
      *,
      project_documents (
        document_id,
        documents (*)
      )
    `
    )
    .eq('id', projectId)
    .single()

  if (!project) throw new Error('Project not found')

  // 2. Find ETT document (required for analysis)
  const ettDocument = project.project_documents.find(
    (pd) => pd.documents.document_type === 'ett'
  )?.documents

  if (!ettDocument) throw new Error('No ETT document attached to project')

  // 3. Extract requirements from ETT
  const requirements = await extractRequirements(
    ettDocument.llm_optimized_content
  )

  // 4. For each requirement, find related documents (semantic search)
  const documentMatches = await Promise.all(
    requirements.map(async (req) => {
      const matches = await semanticSearchDocuments(req.text, req.category)
      return {
        requirement_id: req.id,
        requirement_text: req.text,
        matched_documents: matches.map((m) => ({
          id: m.id,
          filename: m.filename,
          url: m.original_file_url,
        })),
      }
    })
  )

  // 5. Create analysis record (status: pending)
  const analysisResult = await db
    .from('analysis_results')
    .insert({
      project_id: projectId,
      requirements_list: requirements,
      document_matches: documentMatches,
      status: 'pending',
    })
    .select()
    .single()

  // 6. Trigger n8n workflow
  await triggerN8nWorkflow({
    projectId,
    analysisId: analysisResult.id,
    projectName: project.name,
    requirements,
    documentMatches,
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`,
  })

  // 7. Update project with analysis reference
  await db
    .from('projects')
    .update({
      analysis_results_id: analysisResult.id,
      updated_at: new Date(),
    })
    .eq('id', projectId)

  revalidatePath(`/[lang]/projects/${projectId}`, 'page')

  return analysisResult
}
```

### Webhooks (Receivers)

```typescript
// app/api/webhooks/n8n/route.ts

import { db } from '@/lib/db'
import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const payload = await req.json()

  const { analysisId, projectId, reportUrl, status, error } = payload

  // Update analysis result
  if (status === 'completed') {
    await db
      .from('analysis_results')
      .update({
        report_url: reportUrl,
        status: 'completed',
        completed_at: new Date(),
      })
      .eq('id', analysisId)
  } else if (status === 'failed') {
    await db
      .from('analysis_results')
      .update({
        status: 'failed',
        error_message: error,
      })
      .eq('id', analysisId)
  }

  // Revalidate project page so UI updates
  revalidateTag(`project-${projectId}`)

  return NextResponse.json({ success: true })
}
```

---

## AI/LLM Integration Strategy

### Requirement Extraction (Zero-Shot)

**Prompt Design:**

```typescript
// lib/ai/extraction.ts

export async function extractRequirements(
  ettContent: string
): Promise<Requirement[]> {
  const systemPrompt = `You are an expert requirements engineer. Analyze the provided Engineering Technical Specification (ETS) and extract a structured list of requirements.

For each requirement, provide:
- id: unique identifier (e.g., REQ-001)
- text: clear, concise requirement statement
- category: one of [functional, non-functional, constraint, security, performance]
- priority: one of [critical, high, medium, low]
- source_section: which section of the ETS this came from

Output MUST be valid JSON array.`

  const userPrompt = `Extract requirements from this ETS:\n\n${ettContent}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2, // Low temp for consistency
    max_tokens: 4000,
  })

  const content = response.choices[0].message.content
  const parsed = JSON.parse(content)
  return parsed.requirements
}

interface Requirement {
  id: string
  text: string
  category: 'functional' | 'non-functional' | 'constraint' | 'security' | 'performance'
  priority: 'critical' | 'high' | 'medium' | 'low'
  source_section: string
}
```

### Embeddings & Semantic Search

```typescript
// lib/ai/openai.ts

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
  })

  return response.data[0].embedding
}

// lib/search/semantic.ts

export async function semanticSearchDocuments(
  query: string,
  category?: string
): Promise<Document[]> {
  const queryEmbedding = await generateEmbedding(query)

  const result = await db.rpc('search_documents', {
    query_embedding: queryEmbedding,
    limit: 5,
    category_filter: category || null,
  })

  return result
}

// SQL function in Supabase
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector,
  limit int DEFAULT 5,
  category_filter text DEFAULT NULL
)
RETURNS TABLE (id UUID, filename TEXT, document_type TEXT, similarity FLOAT)
AS $$
  SELECT
    d.id,
    d.filename,
    d.document_type,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE
    (category_filter IS NULL OR d.metadata->>'category' = category_filter)
  ORDER BY d.embedding <=> query_embedding
  LIMIT limit;
$$ LANGUAGE SQL;
```

---

## Workflow: From Document Upload to Analysis

### Sequence Diagram

```
User Browser          Next.js App              Supabase            OpenAI              n8n
     │                    │                        │                 │                 │
     │ 1. Upload File     │                        │                 │                 │
     ├───────────────────→│                        │                 │                 │
     │                    │ 2. Put to Blob        │                 │                 │
     │                    ├───────────────────────│                 │                 │
     │                    │ 3. Extract Text      │                 │                 │
     │                    │    (pypdf)            │                 │                 │
     │                    │                       │                 │                 │
     │                    │ 4. Generate Embedding│                 │                 │
     │                    ├─────────────────────────────────────────→│                 │
     │                    │                       │    Embedding     │                 │
     │                    │←─────────────────────────────────────────│                 │
     │                    │                       │                 │                 │
     │                    │ 5. Store Doc + Embedding               │                 │
     │                    ├──────────────────────→│                 │                 │
     │                    │                       │ Stored          │                 │
     │                    │←──────────────────────│                 │                 │
     │ 6. Success JSON   │                       │                 │                 │
     │←───────────────────│                       │                 │                 │
     │                    │                       │                 │                 │
     │ (later) Attach Doc & Trigger Analysis      │                 │                 │
     ├───────────────────→│                       │                 │                 │
     │                    │ 7. Extract Requirements               │                 │
     │                    ├─────────────────────────────────────────→│                 │
     │                    │                       │  Requirements    │                 │
     │                    │←─────────────────────────────────────────│                 │
     │                    │                       │                 │                 │
     │                    │ 8. Semantic Search for Each Requirement│ │                 │
     │                    ├──────────────────────→│                 │                 │
     │                    │        Doc Matches    │                 │                 │
     │                    │←──────────────────────│                 │                 │
     │                    │                       │                 │                 │
     │                    │ 9. Trigger n8n Workflow               │                 │
     │                    ├──────────────────────────────────────────────────────────→│
     │                    │                       │                 │    Accepted      │
     │                    │                       │                 │←─────────────────│
     │                    │                       │                 │                 │
     │                    │                       │                 │ 10. Process    │
     │                    │                       │                 │     Report      │
     │                    │ (async via webhook)   │                 │                 │
     │                    │←───────────────────────────────────────────────────────────│
     │ 11. Report Ready  │                       │                 │                 │
     │←───────────────────│                       │                 │                 │
     │                    │                       │                 │                 │
```

### Upload → Analysis Timeline

```
T+0:00    User clicks "Upload Document" in Documents module
T+0:05    File uploaded to Vercel Blob
T+0:10    Text extracted from PDF
T+0:15    Embedding generated via OpenAI (batched with other uploads)
T+0:20    Document stored in Supabase with vectors
T+0:25    UI updates with new document in knowledge base

T+1:00    User creates project, attaches ETT document
T+2:00    User moves project to "Docs Analysis" stage
T+2:10    User clicks "Trigger Analysis"

T+2:15    Requirements extracted from ETT (GPT-4)
T+2:20    Requirements → semantic search for related docs
T+2:30    n8n workflow triggered with requirements + document URLs

T+2:35    n8n processes each requirement (parallel if configured)
T+3:45    n8n generates markdown analysis report
T+4:00    Report stored in Vercel Blob, URL sent back via webhook
T+4:05    Supabase analysis_results table updated
T+4:10    UI refreshes, user sees analysis results dashboard

Total Time: 4 minutes 10 seconds (first analysis)
Subsequent analyses: 2–3 minutes (documents already vectorized)
```

---

## SEO, Accessibility & Internationalization

### SEO Implementation

#### Metadata Setup

```typescript
// app/layout.tsx

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
  title: {
    default: 'Project Intelligence Platform | ibudi',
    template: '%s | Project Intelligence',
  },
  description:
    'Intelligent document analysis and project management for enterprise teams. Extract requirements, match documents, generate analysis reports.',
  keywords: [
    'project management',
    'document analysis',
    'AI intelligence',
    'requirements extraction',
    'knowledge base',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'Project Intelligence',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Project Intelligence Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@ibudi_io',
    creator: '@ibudi_io',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
}

// Dynamic metadata for locale routes
export async function generateMetadata({
  params,
}: {
  params: { lang: string }
}): Promise<Metadata> {
  const messages = await getMessages(params.lang)
  return {
    title: messages.metadata.title,
    description: messages.metadata.description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_APP_URL}/${params.lang}`,
      languages: {
        en: `${process.env.NEXT_PUBLIC_APP_URL}/en`,
        es: `${process.env.NEXT_PUBLIC_APP_URL}/es`,
        'x-default': `${process.env.NEXT_PUBLIC_APP_URL}/en`,
      },
    },
  }
}
```

#### Schema.org Structured Data

```typescript
// components/common/JsonLd.tsx

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

// Usage in app/[lang]/page.tsx

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Project Intelligence Platform',
  applicationCategory: 'BusinessApplication',
  description: 'Intelligent document analysis and project management',
  operatingSystem: 'Web',
  url: process.env.NEXT_PUBLIC_APP_URL,
  creator: {
    '@type': 'Organization',
    name: 'ibudi',
    url: 'https://ibudi.io',
  },
  featureList: [
    'Project Management',
    'Document Analysis',
    'AI Intelligence',
    'Requirement Extraction',
  ],
}

export default function Page() {
  return (
    <>
      <JsonLd data={organizationSchema} />
      {/* page content */}
    </>
  )
}
```

#### Sitemap & Robots

```typescript
// app/sitemap.ts

import type { MetadataRoute } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL!

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = ['en', 'es']
  const routes = ['', '/projects', '/documents', '/help']

  return [
    ...locales.flatMap((locale) =>
      routes.map((route) => ({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1.0 : 0.8,
      }))
    ),
  ]
}

// app/robots.ts

import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/private/'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  }
}
```

### Accessibility (WCAG 2.1 AA)

#### Skip Navigation Link

```typescript
// components/common/SkipNavigationLink.tsx

export function SkipNavigationLink() {
  return (
    <a
      href="#main-content"
      className="absolute left-0 top-0 -translate-y-full bg-blue-600 px-4 py-2 text-white focus:translate-y-0 focus:relative focus:z-50"
    >
      Skip to main content
    </a>
  )
}

// app/[lang]/layout.tsx

export default function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  return (
    <html lang={params.lang}>
      <body>
        <SkipNavigationLink />
        <Navigation />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

#### Form with Accessibility

```typescript
// components/projects/ProjectForm.tsx

'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { createProject } from '@/app/[lang]/projects/actions'
import { useTranslations } from 'next-intl'

export function ProjectForm() {
  const t = useTranslations()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { pending } = useFormStatus()

  return (
    <form action={createProject} className="space-y-6">
      <div>
        <label
          htmlFor="project-name"
          className="block text-sm font-medium text-gray-900"
        >
          {t('projects.name')}
        </label>
        <input
          id="project-name"
          type="text"
          name="name"
          required
          aria-describedby={errors.name ? 'name-error' : undefined}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.name && (
          <p id="name-error" className="mt-2 text-sm text-red-600">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="project-desc"
          className="block text-sm font-medium text-gray-900"
        >
          {t('projects.description')}
        </label>
        <textarea
          id="project-desc"
          name="description"
          rows={4}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {pending ? t('common.loading') : t('projects.create')}
      </button>
    </form>
  )
}
```

#### Focus Management

```typescript
// Use shadcn/ui Dialog (built on Radix) for focus management
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'

export function AnalysisDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-lg font-bold">Analysis Results</h2>
        </DialogHeader>
        {/* Radix Dialog handles:
            - Focus trap (can't tab outside dialog)
            - Auto-focus on first interactive element
            - Restore focus to trigger on close
            - Escape key closes
            - Click outside closes
        */}
      </DialogContent>
    </Dialog>
  )
}
```

#### Semantic HTML & Heading Structure

```typescript
// app/[lang]/projects/page.tsx

export default function ProjectsPage() {
  return (
    <main id="main-content">
      {/* H1 is unique on the page */}
      <h1 className="text-3xl font-bold">Projects</h1>

      {/* Proper nesting: H2 under H1, H3 under H2 */}
      <section>
        <h2 className="text-xl font-bold">In Progress</h2>
        <ul>
          {projects.map((p) => (
            <li key={p.id}>
              <article>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
```

### Internationalization (i18n)

#### Routing & Locale Detection

```typescript
// lib/i18n/routing.ts

import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  pathnames: {
    '/': '/',
    '/projects': {
      en: '/projects',
      es: '/proyectos',
    },
    '/documents': {
      en: '/documents',
      es: '/documentos',
    },
    '/projects/[id]': {
      en: '/projects/[id]',
      es: '/proyectos/[id]',
    },
  },
})

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing)
```

#### Translation Files

```json
// lib/i18n/messages/en.json
{
  "metadata": {
    "title": "Project Intelligence Platform",
    "description": "Intelligent document analysis and project management"
  },
  "projects": {
    "title": "Projects",
    "name": "Project Name",
    "description": "Description",
    "create": "Create Project",
    "edit": "Edit Project",
    "delete": "Delete Project",
    "stage": "Stage",
    "attachDocuments": "Attach Documents"
  },
  "documents": {
    "title": "Documents",
    "upload": "Upload Document",
    "type": "Document Type",
    "ett": "ETT (Specification)",
    "hardware": "Hardware Inventory",
    "search": "Search Documents",
    "recentUploads": "Recent Uploads"
  },
  "analysis": {
    "title": "Analysis",
    "trigger": "Run Analysis",
    "extractingRequirements": "Extracting requirements...",
    "searchingDocuments": "Finding related documents...",
    "completed": "Analysis completed",
    "results": "Results"
  },
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "success": "Success",
    "save": "Save",
    "cancel": "Cancel",
    "back": "Back"
  }
}
```

```json
// lib/i18n/messages/es.json
{
  "metadata": {
    "title": "Plataforma de Inteligencia de Proyectos",
    "description": "Análisis inteligente de documentos y gestión de proyectos"
  },
  "projects": {
    "title": "Proyectos",
    "name": "Nombre del Proyecto",
    "description": "Descripción",
    "create": "Crear Proyecto",
    "edit": "Editar Proyecto",
    "delete": "Eliminar Proyecto",
    "stage": "Etapa",
    "attachDocuments": "Adjuntar Documentos"
  },
  "documents": {
    "title": "Documentos",
    "upload": "Cargar Documento",
    "type": "Tipo de Documento",
    "ett": "ETT (Especificación)",
    "hardware": "Inventario de Hardware",
    "search": "Buscar Documentos",
    "recentUploads": "Cargas Recientes"
  },
  "analysis": {
    "title": "Análisis",
    "trigger": "Ejecutar Análisis",
    "extractingRequirements": "Extrayendo requisitos...",
    "searchingDocuments": "Encontrando documentos relacionados...",
    "completed": "Análisis completado",
    "results": "Resultados"
  },
  "common": {
    "loading": "Cargando...",
    "error": "Ocurrió un error",
    "success": "Éxito",
    "save": "Guardar",
    "cancel": "Cancelar",
    "back": "Atrás"
  }
}
```

#### Language Switcher

```typescript
// components/common/LanguageSwitcher.tsx

'use client'

import { usePathname } from '@/lib/i18n/routing'
import Link from 'next/link'
import { useLocale } from 'next-intl'

export function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()

  const locales = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
  ]

  return (
    <div className="flex gap-2">
      {locales.map((loc) => (
        <Link
          key={loc.code}
          href={pathname}
          locale={loc.code}
          className={`rounded px-2 py-1 ${
            locale === loc.code
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800'
          }`}
          aria-current={locale === loc.code ? 'page' : undefined}
        >
          {loc.label}
        </Link>
      ))}
    </div>
  )
}
```

---

## Development Roadmap (14-day POC)

### Sprint Timeline

#### **Days 1–2: Foundation & Setup**
- [ ] Repository setup (Next.js 15, TypeScript strict, ESLint, Prettier)
- [ ] Tailwind + shadcn/ui initial component library
- [ ] Supabase project creation + database schema
- [ ] Authentication setup (Supabase Auth + Server Actions)
- [ ] Environment variables (.env.local)
- [ ] SEO & i18n foundation (metadata, routing, messages)

**Deliverable:** Deployed skeleton app with auth

#### **Days 3–4: Projects Module**
- [ ] Projects table + CRUD Server Actions
- [ ] Projects list page (RSC with filtering)
- [ ] Project detail page (with pipeline stage visualization)
- [ ] Project edit form (with validation)
- [ ] Audit logging (track all actions)

**Deliverable:** Full CRUD project management

#### **Days 5–6: Documents Module (Upload)**
- [ ] Documents table schema
- [ ] Upload form component (file input, validation)
- [ ] Vercel Blob integration (upload & store original)
- [ ] PDF text extraction (pypdf or pdf-parse)
- [ ] LLM-optimized formatting

**Deliverable:** Document upload pipeline (no AI yet)

#### **Days 7–8: AI Integration (Embeddings)**
- [ ] OpenAI API integration (embeddings)
- [ ] Batch embedding generation (for uploaded docs)
- [ ] Vector storage in Supabase (pgvector)
- [ ] Semantic search implementation
- [ ] Document search UI

**Deliverable:** Knowledge base with semantic search

#### **Days 9–10: Analysis Module & n8n Integration**
- [ ] Requirement extraction (GPT-4 + zero-shot)
- [ ] Semantic search for each requirement
- [ ] n8n webhook trigger (send requirements + doc URLs)
- [ ] Webhook receiver (n8n → Next.js)
- [ ] Analysis results UI & storage

**Deliverable:** Full analysis workflow end-to-end

#### **Days 11–12: Document-Project Linking**
- [ ] M2M relationship (projects ↔ documents)
- [ ] Attach documents to project
- [ ] Show attached documents in project view
- [ ] Cascade updates (when document changes)

**Deliverable:** Integrated projects + documents

#### **Days 13–14: SEO, A11y, i18n Polish**
- [ ] Metadata per route (titles, descriptions, OG)
- [ ] hreflang tags for EN/ES
- [ ] Accessibility audit (focus, ARIA, semantic HTML)
- [ ] i18n setup (route localization, translation UI)
- [ ] Performance audit (CWV targets)
- [ ] Final testing & deployment to Vercel

**Deliverable:** Production-ready POC deployed

---

## Success Criteria & Metrics

### Functional Requirements (MVP)

- ✅ Create, read, update, delete projects
- ✅ View projects in stage-based pipeline
- ✅ Upload documents (ETT, Hardware) with automatic LLM-optimized conversion
- ✅ Semantic search documents by query
- ✅ Attach documents to projects (M:M)
- ✅ Trigger analysis: extract requirements → semantic search → n8n workflow
- ✅ View analysis results with matched documents
- ✅ Full SEO implementation (metadata, schema, sitemap)
- ✅ Full accessibility (WCAG 2.1 AA)
- ✅ Full internationalization (EN/ES)

### Technical Requirements

- ✅ TypeScript strict mode (zero `any`)
- ✅ Server Components by default (only `use client` when necessary)
- ✅ Zod validation on all inputs
- ✅ Server Actions for mutations (no fetch on client)
- ✅ Supabase RLS policies for multi-tenant security
- ✅ Error boundaries + loading states
- ✅ Audit logging for compliance
- ✅ 100% test coverage for critical paths (React Testing Library + Playwright)

### Performance Targets (Core Web Vitals)

- ✅ **LCP (Largest Contentful Paint):** <2.5s
- ✅ **INP (Interaction to Next Paint):** <200ms
- ✅ **CLS (Cumulative Layout Shift):** <0.1
- ✅ Lighthouse Score: >90 (Performance, Accessibility, SEO)

### User Experience

- ✅ Document upload → analysis results: <5 minutes
- ✅ Project creation flow: <2 minutes
- ✅ Search documents: <500ms
- ✅ Zero console errors
- ✅ Keyboard navigation on all pages
- ✅ Mobile-responsive design (mobile-first)

### Business Metrics (During POC)

- ✅ Document types captured: 2 (ETT, Hardware)
- ✅ Projects created: 5–10 (test projects)
- ✅ Analysis triggers: 5+ (to validate workflow)
- ✅ Requirements extracted per project: 15–30 avg
- ✅ Document matches per requirement: 3–5 avg
- ✅ User feedback collected (C-suite review)

---

## Next Phases (Post-POC Roadmap)

### Phase 2 (Month 2): Scaling & Polish
- [ ] Real-time collaboration (WebSocket for simultaneous editing)
- [ ] Document versioning & history
- [ ] Advanced filtering & sorting
- [ ] Bulk document import (ZIP upload)
- [ ] PDF report generation (requirements + matches)
- [ ] Email notifications (analysis complete)
- [ ] User roles & permissions (viewer, editor, admin)

### Phase 3 (Month 3): Enterprise Features
- [ ] SAML/SSO integration
- [ ] API keys for third-party integrations
- [ ] Webhook webhooks for automation
- [ ] Advanced analytics dashboard
- [ ] Custom metadata fields
- [ ] Compliance audit reports

### Phase 4 (Month 4+): AI Enhancements
- [ ] Multi-document requirement reconciliation
- [ ] Automatic risk identification
- [ ] Generated improvement recommendations
- [ ] Trend analysis across projects
- [ ] Fine-tuned GPT models for domain

---

## Deployment & Go-Live

### Pre-Launch Checklist

```
□ Vercel deployment configured
□ Supabase backups verified
□ n8n workflow tested end-to-end
□ Google Search Console + Analytics setup
□ SSL certificate active
□ Error monitoring (Sentry) configured
□ Uptime monitoring (Pingdom)
□ API rate limiting configured
□ Database query performance audited
□ Core Web Vitals passing
□ Accessibility audit passed (AXE)
□ Security scan passed (OWASP Top 10)
□ Load testing (1000 concurrent users)
□ Disaster recovery plan documented
□ SLA defined (99.9% uptime)
```

### Monitoring Post-Launch

- **Uptime:** Pingdom (5-minute checks)
- **Performance:** Vercel Analytics + Google PageSpeed Insights
- **Errors:** Sentry (real-time alerts)
- **Database:** Supabase monitoring (query performance, storage)
- **User Activity:** PostHog (product analytics)

---

## Conclusion

This **Project Intelligence Platform** is designed as an **enterprise-grade, production-ready system** that combines intelligent document analysis with streamlined project management. By leveraging Server Components, vector embeddings, and n8n orchestration, we're building a platform that saves time, reduces errors, and scales with the client's organization.

The 14-day POC focuses on proving the core value: documents → requirements → matching documents → analysis, all automated end-to-end.

**Key Differentiation:**
- ✅ **Server-first architecture** (zero unnecessary JS)
- ✅ **Semantic understanding** (embeddings, not full-text search)
- ✅ **Enterprise-ready** (SEO, accessibility, i18n from day one)
- ✅ **Auditability** (every action logged)
- ✅ **No vendor lock-in** (open-source n8n, PostgreSQL, standard APIs)

**Timeline to Revenue:**
- POC: 2 weeks
- Pilot with client: 2 weeks
- Case study publication: 4 weeks
- Sales pipeline: Ongoing

---

**Version:** 1.0 (May 2026)  
**Status:** Ready for Design Phase  
**Next Step:** Stakeholder approval → Development kickoff
