# 🎯 Complete Task Breakdown — Docs Analysis Platform POC
## 14-Day Sprint Implementation Plan

**Project:** Intelligent Document Analysis Platform  
**Duration:** 14 days (2 weeks)  
**Team Size:** 4 people (1 Full-stack × 2, 1 DevOps, 1 QA)  
**Start Date:** [TBD]  
**Target Launch:** Day 15 (EOD)

---

## 📋 Table of Contents

1. [Pre-Sprint Setup (Day 0)](#pre-sprint-setup)
2. [Sprint Breakdown (Days 1-14)](#sprint-breakdown)
3. [Post-Launch (Week 3-4)](#post-launch)
4. [Testing Strategy](#testing-strategy)
5. [Deployment Checklist](#deployment-checklist)
6. [Risk Mitigation](#risk-mitigation)

---

## Pre-Sprint Setup (Day 0)

### Phase 1: Infrastructure & Credentials

#### Task 1.1: Repository Setup
- **Owner:** DevOps / Tech Lead
- **Estimated Time:** 30 min
- **Dependencies:** None
- **Acceptance Criteria:**
  - [ ] GitHub repo created (`docs-analysis`)
  - [ ] Branch protection rules enabled (require PR review)
  - [ ] `.gitignore` configured (exclude `.env.local`)
  - [ ] Initial commit with README
  - [ ] Team members have write access

**Subtasks:**
```bash
# 1. Create repo on GitHub
# 2. Clone locally
git clone https://github.com/yourorg/docs-analysis.git
cd docs-analysis

# 3. Setup gitignore
cat > .gitignore << EOF
node_modules/
.env.local
.env.*.local
.next/
dist/
build/
*.log
.DS_Store
EOF

# 4. Create initial README
cat > README.md << EOF
# Docs Analysis Platform - POC
Intelligent document analysis for enterprise teams.

## Stack
- Next.js 15 (App Router)
- Supabase PostgreSQL + pgvector
- OpenAI Embeddings
- n8n Workflow
- TypeScript + Tailwind

## Setup
npm install
npm run dev
EOF

# 5. Initial commit
git add .
git commit -m "Initial commit: project structure"
git push origin main
```

---

#### Task 1.2: Supabase Project Creation & Configuration
- **Owner:** DevOps
- **Estimated Time:** 45 min
- **Dependencies:** Task 1.1
- **Acceptance Criteria:**
  - [ ] Supabase project created
  - [ ] PostgreSQL database accessible
  - [ ] pgvector extension enabled
  - [ ] API keys generated and documented
  - [ ] Row-level security enabled by default
  - [ ] Backups configured (daily)

**Subtasks:**
```bash
# 1. Create project at supabase.com
# 2. Navigate to Settings > API to get keys:
#    - NEXT_PUBLIC_SUPABASE_URL
#    - NEXT_PUBLIC_SUPABASE_ANON_KEY
#    - SUPABASE_SERVICE_ROLE_KEY

# 3. Enable pgvector extension
# SQL Editor > New Query
CREATE EXTENSION IF NOT EXISTS vector;

# 4. Test connection
supabase status

# 5. Setup local development (optional)
supabase start
supabase migration new create_tables
```

**Document in Shared Space:**
```
Supabase Project: [URL]
API Keys: [Stored in 1Password/LastPass]
Contact: [DevOps Lead]
```

---

#### Task 1.3: OpenAI API Setup
- **Owner:** Tech Lead / DevOps
- **Estimated Time:** 15 min
- **Dependencies:** None
- **Acceptance Criteria:**
  - [ ] OpenAI API account created/confirmed
  - [ ] API key generated with restricted permissions
  - [ ] Usage limits set ($100/month cap recommended)
  - [ ] Key stored securely
  - [ ] Test call successful

**Subtasks:**
```bash
# 1. Create API key at platform.openai.com/api-keys
# 2. Set organization-level usage limits
# 3. Test in Node.js
node << 'EOF'
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

openai.embeddings.create({
  model: 'text-embedding-3-large',
  input: 'test query'
}).then(res => console.log('✓ OpenAI API works'));
EOF
```

---

#### Task 1.4: n8n Instance Setup
- **Owner:** DevOps
- **Estimated Time:** 1 hour
- **Dependencies:** None
- **Acceptance Criteria:**
  - [ ] n8n running (Cloud or self-hosted)
  - [ ] Webhook URL accessible from internet
  - [ ] Credentials stored securely
  - [ ] Test workflow created and executed
  - [ ] Python capabilities verified

**Subtasks:**
```
Option A: n8n Cloud
- Sign up at app.n8n.cloud
- Create workspace
- Generate webhook URL
- Document webhook URL

Option B: Self-Hosted
- Deploy on VPS or Docker
- Configure reverse proxy (nginx)
- Generate webhook URL
- Setup log aggregation

Minimum Requirements:
- Python 3.9+ available
- 2GB RAM, 10GB disk
- Webhook ingress open (port 80/443)
```

**Verify:**
```
GET https://your-n8n-instance/webhook/test-connection
Expected: 404 (webhook listening)
```

---

#### Task 1.5: Vercel Blob Setup
- **Owner:** DevOps / Tech Lead
- **Estimated Time:** 20 min
- **Dependencies:** Task 1.1
- **Acceptance Criteria:**
  - [ ] Vercel account linked
  - [ ] Blob storage enabled
  - [ ] Token generated
  - [ ] Upload test successful
  - [ ] CDN accessible from US + EU

**Subtasks:**
```bash
# 1. Link GitHub repo to Vercel
# 2. Enable Blob Storage in project
# 3. Generate BLOB_READ_WRITE_TOKEN
# 4. Store in .env.local and Vercel dashboard
# 5. Test upload
npm install @vercel/blob

node << 'EOF'
const { put } = require('@vercel/blob');
const fs = require('fs');

put('test.txt', 'Hello World', { access: 'private' })
  .then(blob => console.log('✓ Blob upload works:', blob.url));
EOF
```

---

#### Task 1.6: Environment Variables Configuration
- **Owner:** Tech Lead / DevOps
- **Estimated Time:** 15 min
- **Dependencies:** Tasks 1.2, 1.3, 1.4, 1.5
- **Acceptance Criteria:**
  - [ ] `.env.local` created with all secrets
  - [ ] Vercel dashboard has matching vars
  - [ ] `.env.example` created (no secrets)
  - [ ] Team has secure access to secrets

**File: `.env.local`**
```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-large

# n8n
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/analysis

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Optional: Analytics
NEXT_PUBLIC_GA_ID=G-...
```

**File: `.env.example`**
```bash
# Same as above but with placeholder values
# Commit this to repo (no secrets)
```

---

#### Task 1.7: Team Onboarding & Access Setup
- **Owner:** Tech Lead
- **Estimated Time:** 1 hour
- **Dependencies:** All Tasks 1.1-1.6
- **Acceptance Criteria:**
  - [ ] All team members have GitHub access
  - [ ] All team members can access Supabase
  - [ ] All team members can access Vercel dashboard
  - [ ] All team members know n8n webhook URL
  - [ ] Slack channel created for async updates
  - [ ] Daily standup scheduled

**Checklist per Team Member:**
```
□ GitHub: Can clone repo, create branches, push
□ Supabase: Can view database (readonly or readwrite)
□ Vercel: Can view deployments, logs
□ 1Password/LastPass: Knows where secrets are
□ Slack: Added to #docs-analysis channel
□ Notion/Linear: Can see task board
□ Calendar: Standup meeting (daily 9 AM)
```

---

## Sprint Breakdown (Days 1-14)

---

## 🔨 Day 1: Foundation & Next.js Setup

### Task 2.1: Create Next.js Project
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 45 min
- **Dependencies:** Task 1.1
- **Acceptance Criteria:**
  - [ ] Next.js 15 with App Router
  - [ ] TypeScript strict mode enabled
  - [ ] Tailwind + shadcn/ui configured
  - [ ] `npm run dev` works locally
  - [ ] Vercel deployment configured

**Subtasks:**
```bash
# 1. Create Next.js project
npx create-next-app@latest docs-analysis \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias '@/*'

# 2. Navigate to project
cd docs-analysis

# 3. Setup shadcn/ui
npx shadcn-ui@latest init
# Choose: TypeScript, Tailwind, ESLint, all defaults

# 4. Install initial shadcn components
npx shadcn-ui@latest add button input form dialog

# 5. Test
npm run dev
# Visit http://localhost:3000 → Should see Next.js page

# 6. Push to GitHub
git add .
git commit -m "feat: create Next.js 15 project with TypeScript"
git push origin main

# 7. Deploy to Vercel
# Go to vercel.com > Import project > Select GitHub repo
# Configure environment variables from Task 1.6
# Deploy
```

**File: `src/app/layout.tsx`**
```typescript
import type { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Docs Analysis Platform',
  description: 'Intelligent document analysis for enterprise teams',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

---

### Task 2.2: Install & Configure Dependencies
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 30 min
- **Dependencies:** Task 2.1
- **Acceptance Criteria:**
  - [ ] All dependencies installed
  - [ ] No vulnerability warnings
  - [ ] TypeScript compiles cleanly
  - [ ] `npm run lint` passes

**Subtasks:**
```bash
# Install dependencies (see Day 1 section in quick-start-dev-guide.md)
npm install @supabase/supabase-js @prisma/client
npm install @tanstack/react-query next-intl zod react-hook-form
npm install @vercel/blob pdf-parse pdfjs-dist
npm install openai date-fns uuid
npm install -D prisma typescript @types/node @types/react

# Verify no vulnerabilities
npm audit
# If vulnerabilities exist, resolve them before proceeding

# Configure TypeScript
# Verify tsconfig.json has strict: true

# Verify ESLint
npm run lint
```

---

### Task 2.3: Create Folder Structure
- **Owner:** Tech Lead / Full-Stack Engineer #1
- **Estimated Time:** 20 min
- **Dependencies:** Task 2.1
- **Acceptance Criteria:**
  - [ ] All folders created
  - [ ] `.gitkeep` files in empty dirs
  - [ ] README files in key folders

**Folder Structure:**
```
src/
├── app/
│   ├── [lang]/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── projects/
│   │   ├── documents/
│   │   └── not-found.tsx
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── n8n/
│   │   ├── search/
│   │   └── health/
│   ├── layout.tsx
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── ui/
│   ├── projects/
│   ├── documents/
│   ├── analysis/
│   ├── layout/
│   └── common/
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   ├── ai/
│   ├── search/
│   ├── n8n/
│   ├── validation/
│   ├── i18n/
│   └── utils/
├── styles/
│   ├── globals.css
│   └── variables.css
├── middleware.ts
├── public/
├── types/
│   └── index.ts
└── constants/
    └── config.ts
```

**Bash:**
```bash
# Create structure
mkdir -p src/app/{lang,api/{webhooks/n8n,search,health}}
mkdir -p src/components/{ui,projects,documents,analysis,layout,common}
mkdir -p src/lib/{ai,search,n8n,validation,i18n,utils}
mkdir -p src/styles src/public src/types src/constants

# Add gitkeep files
find src -type d -empty -exec touch {}/.gitkeep \;

# Create README files
echo "# UI Components" > src/components/ui/README.md
echo "# Server Actions & DB" > src/lib/README.md
```

---

### Task 2.4: Setup TypeScript & ESLint Configuration
- **Owner:** Tech Lead
- **Estimated Time:** 20 min
- **Dependencies:** Task 2.2
- **Acceptance Criteria:**
  - [ ] `tsconfig.json` strict mode enabled
  - [ ] `.eslintrc.json` configured
  - [ ] `prettier.config.js` configured
  - [ ] `npm run lint` passes

**File: `tsconfig.json`** (Key Settings)
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
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**File: `.eslintrc.json`**
```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "react-hooks/exhaustive-deps": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@next/next/no-html-link-for-pages": "off"
  }
}
```

**File: `prettier.config.js`**
```javascript
module.exports = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
}
```

---

### Task 2.5: Create Core Library Files
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 45 min
- **Dependencies:** Tasks 2.1, 1.6
- **Acceptance Criteria:**
  - [ ] `src/lib/db.ts` works
  - [ ] `src/lib/auth.ts` works
  - [ ] `src/lib/ai/openai.ts` works
  - [ ] No TypeScript errors
  - [ ] Can instantiate Supabase client

**File: `src/lib/db.ts`**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Server-side client (with service role key for admin operations)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

**File: `src/lib/auth.ts`**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
)

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const session = await getSession()
  return session?.user ?? null
}
```

**File: `src/lib/ai/openai.ts`**
```typescript
import { OpenAI } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
    input: text,
  })

  return response.data[0].embedding
}

export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
    input: texts,
  })

  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding)
}
```

---

### Task 2.6: Setup Validation Schemas (Zod)
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 30 min
- **Dependencies:** Task 2.2
- **Acceptance Criteria:**
  - [ ] All schemas created
  - [ ] Types inferred from schemas
  - [ ] Can parse and validate data

**File: `src/lib/validation/schemas.ts`**
```typescript
import { z } from 'zod'

// Projects
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name required').max(200),
  description: z.string().optional(),
})

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  stage: z.enum(['initiation', 'planning', 'docs_analysis', 'development', 'deployment', 'completed']),
})

// Documents
export const DocumentUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 50 * 1024 * 1024, 'File too large (max 50MB)'),
  documentType: z.enum(['ett', 'hardware']),
})

// Analysis
export const SelectedDocumentSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  originalFileUrl: z.string().url(),
  documentType: z.enum(['ett', 'hardware']),
})

// Infer types
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type SelectedDocument = z.infer<typeof SelectedDocumentSchema>
```

---

### End of Day 1 Checklist
- [ ] Next.js project created and running locally
- [ ] All dependencies installed
- [ ] Folder structure created
- [ ] TypeScript strict mode enabled
- [ ] Core library files created
- [ ] Deployed to Vercel (staging)
- [ ] No TypeScript errors
- [ ] All code committed and pushed

**By EOD Day 1:** You should have a working Next.js skeleton deployed to Vercel that compiles cleanly.

---

## 🔐 Day 2: Database Schema & Authentication

### Task 3.1: Create Supabase Database Tables
- **Owner:** Full-Stack Engineer #1 / DevOps
- **Estimated Time:** 1.5 hours
- **Dependencies:** Task 1.2
- **Acceptance Criteria:**
  - [ ] All tables created
  - [ ] All indexes created
  - [ ] RLS policies enabled
  - [ ] Foreign key constraints verified
  - [ ] Can query all tables from Supabase UI

**Subtasks:**

**1. SQL: Create Tables**

Run in Supabase SQL Editor:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Users (managed by Supabase Auth)
-- auth.users table created automatically

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
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  analysis_results_id UUID,
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
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_doc_type CHECK (document_type IN ('ett', 'hardware'))
);

-- Project-Documents (M2M)
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
  selected_documents JSONB NOT NULL DEFAULT '[]',
  zip_file_url TEXT,
  analysis_metadata JSONB,
  triggered_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status TEXT DEFAULT 'pending',
  error_message TEXT
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  changes JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_team_id ON projects(team_id);
CREATE INDEX idx_projects_stage ON projects(stage);
CREATE INDEX idx_documents_team_id ON documents(team_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_analysis_project_id ON analysis_results(project_id);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
```

**2. Enable RLS (Row Level Security)**

```sql
-- Teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY teams_select ON teams FOR SELECT USING (true);
CREATE POLICY teams_insert ON teams FOR INSERT WITH CHECK (true);

-- Projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_select ON projects
  FOR SELECT USING (team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid()));
CREATE POLICY projects_insert ON projects
  FOR INSERT WITH CHECK (
    team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    AND owner_id = auth.uid()
  );
CREATE POLICY projects_update ON projects
  FOR UPDATE USING (team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid()));

-- Documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_select ON documents
  FOR SELECT USING (team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid()));
CREATE POLICY documents_insert ON documents
  FOR INSERT WITH CHECK (
    team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    AND uploaded_by = auth.uid()
  );

-- Project Documents
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_documents_select ON project_documents
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- Analysis Results
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY analysis_results_select ON analysis_results
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- Audit Logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING (user_id = auth.uid());
```

**3. Create Search Function**

```sql
CREATE OR REPLACE FUNCTION search_documents_semantic(
  query_embedding VECTOR(1536),
  team_id_param UUID,
  doc_type_filter TEXT DEFAULT NULL,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  filename TEXT,
  document_type TEXT,
  similarity FLOAT,
  uploaded_at TIMESTAMP
)
AS $$
  SELECT
    d.id,
    d.filename,
    d.document_type,
    1 - (d.embedding <=> query_embedding) AS similarity,
    d.uploaded_at
  FROM documents d
  WHERE 
    d.team_id = team_id_param
    AND d.embedding IS NOT NULL
    AND (doc_type_filter IS NULL OR d.document_type = doc_type_filter)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE SQL;
```

---

### Task 3.2: Setup Authentication (Supabase Auth)
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 1 hour
- **Dependencies:** Tasks 1.2, 3.1
- **Acceptance Criteria:**
  - [ ] Auth providers configured (Email + Google)
  - [ ] Callback URL configured
  - [ ] Can sign up and sign in
  - [ ] JWT tokens working
  - [ ] Auth middleware in place

**Subtasks:**

**1. Configure Auth Providers**

In Supabase Dashboard:
1. Go to Authentication > Providers
2. Enable "Email"
3. Enable "Google" (add OAuth credentials)
4. Set Redirect URLs:
   ```
   http://localhost:3000/auth/callback
   https://[your-domain].com/auth/callback
   https://[your-domain].vercel.app/auth/callback
   ```

**2. Create Auth Callback Route**

**File: `src/app/api/auth/callback/route.ts`**
```typescript
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${requestUrl.origin}/en/projects`)
    }
  }

  // Return error
  return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
}
```

**3. Create Auth Guard**

**File: `src/lib/auth/guard.ts`**
```typescript
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    redirect('/auth/signin')
  }
  return user
}
```

**4. Create Sign In Page**

**File: `src/app/[lang]/auth/signin/page.tsx`**
```typescript
'use client'

import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      // Show success message
      setEmail('')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSignIn} className="w-full max-w-md space-y-4">
        <h1 className="text-3xl font-bold">Sign In</h1>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full border rounded p-2"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Sign In'}
        </button>

        {error && <p className="text-red-600">{error}</p>}
      </form>
    </div>
  )
}
```

**5. Setup Middleware (i18n + Auth)**

**File: `src/middleware.ts`**
```typescript
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/lib/i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
}
```

---

### Task 3.3: Test Database Connectivity
- **Owner:** QA
- **Estimated Time:** 20 min
- **Dependencies:** Tasks 3.1, 3.2
- **Acceptance Criteria:**
  - [ ] Can connect to Supabase
  - [ ] Can read from teams table
  - [ ] Can insert into teams table
  - [ ] RLS policies work correctly
  - [ ] Error handling works

**Test Script: `scripts/test-db.ts`**
```typescript
import { supabaseAdmin } from '@/lib/db'

async function testDatabase() {
  console.log('Testing database connection...')

  try {
    // Test 1: Create a team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({ name: 'Test Team' })
      .select()
      .single()

    if (teamError) throw teamError
    console.log('✓ Created team:', team.id)

    // Test 2: Query teams
    const { data: teams, error: queryError } = await supabaseAdmin
      .from('teams')
      .select()

    if (queryError) throw queryError
    console.log('✓ Found', teams?.length || 0, 'teams')

    // Test 3: Delete test team
    await supabaseAdmin.from('teams').delete().eq('id', team.id)
    console.log('✓ Cleaned up test team')

    console.log('\n✅ All database tests passed!')
  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  }
}

testDatabase()
```

**Run:**
```bash
npx ts-node scripts/test-db.ts
```

---

### End of Day 2 Checklist
- [ ] All database tables created
- [ ] All indexes created
- [ ] RLS policies enabled
- [ ] Semantic search function created
- [ ] Authentication configured
- [ ] Sign-in page working
- [ ] Database tests passing
- [ ] Code committed and pushed

**By EOD Day 2:** Database is ready and authentication works locally.

---

## 📁 Days 3-4: Projects Module

### Task 4.1: Create Projects Table & Server Actions (CRUD)
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 2 hours
- **Dependencies:** Tasks 3.1, 3.2
- **Acceptance Criteria:**
  - [ ] `createProject` action works
  - [ ] `updateProject` action works
  - [ ] `updateProjectStage` action works
  - [ ] `deleteProject` action works
  - [ ] Audit logs created for each action
  - [ ] RLS policies prevent unauthorized access
  - [ ] TypeScript types correct

**File: `src/app/[lang]/projects/actions.ts`**
(See corrected-implementation-guide.md for full code)

---

### Task 4.2: Create Projects List Page (RSC)
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 1.5 hours
- **Dependencies:** Task 4.1
- **Acceptance Criteria:**
  - [ ] Displays all projects for team
  - [ ] Shows project stage
  - [ ] Shows owner name
  - [ ] Sorted by updated_at DESC
  - [ ] Pagination works (if >20 projects)
  - [ ] Mobile responsive

**File: `src/app/[lang]/projects/page.tsx`**
(See corrected-implementation-guide.md)

---

### Task 4.3: Create Project Detail Page
- **Owner:** Full-Stack Engineer #2
- **Estimated Time:** 1.5 hours
- **Dependencies:** Task 4.1
- **Acceptance Criteria:**
  - [ ] Displays project details
  - [ ] Shows pipeline stages (visual)
  - [ ] Can change stage
  - [ ] Shows attached documents
  - [ ] Can attach documents
  - [ ] Shows analysis status (if exists)

**File: `src/app/[lang]/projects/[id]/page.tsx`**

---

### Task 4.4: Create Project Form Component
- **Owner:** Full-Stack Engineer #2
- **Estimated Time:** 1.5 hours
- **Dependencies:** Task 4.1
- **Acceptance Criteria:**
  - [ ] Form validation works
  - [ ] Error messages display
  - [ ] Can create new project
  - [ ] Can edit existing project
  - [ ] Loading state works

**File: `src/components/projects/ProjectForm.tsx`**

---

### Task 4.5: Create Project Pipeline Component
- **Owner:** Full-Stack Engineer #2
- **Estimated Time:** 1 hour
- **Dependencies:** Task 4.1
- **Acceptance Criteria:**
  - [ ] Shows all 6 stages
  - [ ] Highlights current stage
  - [ ] Can move to next stage
  - [ ] Shows visual feedback

**File: `src/components/projects/ProjectPipeline.tsx`**

---

### Task 4.6: Test Projects Module
- **Owner:** QA
- **Estimated Time:** 1.5 hours
- **Dependencies:** Tasks 4.1-4.5
- **Acceptance Criteria:**
  - [ ] Can create project
  - [ ] Can update project
  - [ ] Can change stage
  - [ ] Can delete project
  - [ ] RLS prevents unauthorized access
  - [ ] Audit logs recorded

**Manual Tests:**
```
1. Sign in
2. Create project "Test Project"
3. Verify created in database
4. Edit project name
5. Change stage to "planning"
6. Delete project
7. Verify delete worked
8. Check audit logs
```

**Playwright Tests:**
```typescript
// tests/projects.spec.ts
test('can create and delete project', async ({ page }) => {
  // Sign in
  await page.goto('/en')
  await page.fill('input[type="email"]', 'test@example.com')
  // ... etc
})
```

---

### End of Days 3-4 Checklist
- [ ] Projects CRUD fully functional
- [ ] Projects list page working
- [ ] Project detail page working
- [ ] Pipeline visualization working
- [ ] All tests passing
- [ ] Code reviewed and merged
- [ ] Deployed to staging

**By EOD Day 4:** Projects module is complete and tested.

---

## 📄 Days 5-6: Documents Module (Upload & Embeddings)

### Task 5.1: Create Document Upload Server Action
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 2 hours
- **Dependencies:** Tasks 3.1, 1.5 (Vercel Blob)
- **Acceptance Criteria:**
  - [ ] Can upload PDF files
  - [ ] Validates file size (<50MB)
  - [ ] Validates file type (.pdf)
  - [ ] Uploads to Vercel Blob
  - [ ] Stores in Supabase
  - [ ] Audit log created
  - [ ] Returns document ID

**File: `src/app/[lang]/documents/actions.ts`**
(See corrected-implementation-guide.md)

---

### Task 5.2: Create PDF Text Extraction
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 1 hour
- **Dependencies:** Task 5.1
- **Acceptance Criteria:**
  - [ ] Can extract text from PDF
  - [ ] Handles multi-page PDFs
  - [ ] Preserves structure (headings, sections)
  - [ ] Handles corrupted PDFs gracefully
  - [ ] Returns clean text

**File: `src/lib/file/pdf.ts`**
```typescript
import * as pdfjsLib from 'pdfjs-dist'

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item: any) => item.str || '')
      .join(' ')
    fullText += `\n--- Page ${i} ---\n${pageText}`
  }

  return fullText
}
```

---

### Task 5.3: Create Embedding Generation (Post-Upload)
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 1 hour
- **Dependencies:** Tasks 5.1, 1.3 (OpenAI)
- **Acceptance Criteria:**
  - [ ] Generates embedding after upload
  - [ ] Stores embedding in Supabase
  - [ ] Handles API failures gracefully
  - [ ] Updates document status to "indexed"

**File: `src/app/[lang]/documents/actions.ts` (extended)**
```typescript
export async function generateDocumentEmbedding(documentId: string) {
  const supabase = createClient(...)
  const user = await getUser()

  // Get document
  const { data: doc } = await supabase
    .from('documents')
    .select('llm_optimized_content')
    .eq('id', documentId)
    .single()

  if (!doc?.llm_optimized_content) {
    throw new Error('Document has no content')
  }

  // Generate embedding
  const embedding = await generateEmbedding(doc.llm_optimized_content)

  // Store embedding
  await supabase
    .from('documents')
    .update({ embedding })
    .eq('id', documentId)

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user?.id,
    action: 'indexed',
    resource_type: 'document',
    resource_id: documentId,
  })
}
```

---

### Task 5.4: Create Document Upload UI Component
- **Owner:** Full-Stack Engineer #2
- **Estimated Time:** 1.5 hours
- **Dependencies:** Task 5.1
- **Acceptance Criteria:**
  - [ ] Shows file input
  - [ ] Shows document type selector
  - [ ] Shows upload progress
  - [ ] Shows success message
  - [ ] Shows error message if upload fails
  - [ ] Disables button while uploading

**File: `src/components/documents/DocumentUploader.tsx`**
```typescript
'use client'

import { useState } from 'react'
import { uploadDocument } from '@/app/[lang]/documents/actions'
import { useFormStatus } from 'react-dom'

export function DocumentUploader() {
  const [docType, setDocType] = useState<'ett' | 'hardware'>('ett')
  const [error, setError] = useState('')
  const { pending } = useFormStatus()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    formData.set('documentType', docType)

    try {
      await uploadDocument(formData)
      e.currentTarget.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          Document Type
        </label>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value as 'ett' | 'hardware')}
          className="w-full border rounded p-2"
        >
          <option value="ett">ETT (Specification)</option>
          <option value="hardware">Hardware Inventory</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Upload PDF File
        </label>
        <input
          type="file"
          name="file"
          accept=".pdf"
          required
          disabled={pending}
          className="w-full"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? 'Uploading...' : 'Upload'}
      </button>

      {error && <p className="text-red-600">{error}</p>}
    </form>
  )
}
```

---

### Task 5.5: Create Documents List Page
- **Owner:** Full-Stack Engineer #2
- **Estimated Time:** 1.5 hours
- **Dependencies:** Tasks 5.1-5.4
- **Acceptance Criteria:**
  - [ ] Lists all documents for team
  - [ ] Shows filename, type, upload date
  - [ ] Shows embedding status (✓ indexed or ⏳ indexing)
  - [ ] Can delete documents
  - [ ] Sorted by updated_at DESC

**File: `src/app/[lang]/documents/page.tsx`**

---

### Task 5.6: Test Document Upload Module
- **Owner:** QA
- **Estimated Time:** 1.5 hours
- **Dependencies:** Tasks 5.1-5.5
- **Acceptance Criteria:**
  - [ ] Can upload ETT document
  - [ ] Can upload Hardware document
  - [ ] Document appears in list
  - [ ] Embedding generates after upload
  - [ ] Can view document details
  - [ ] Can delete document

---

### End of Days 5-6 Checklist
- [ ] Document upload fully functional
- [ ] PDF text extraction working
- [ ] Embeddings generating and storing
- [ ] Documents list page working
- [ ] All tests passing
- [ ] Deployed to staging

**By EOD Day 6:** Documents module complete. Can upload and index PDFs.

---

## 🔍 Days 7-8: AI Integration (Semantic Search)

### Task 6.1: Create Semantic Search Function
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 1 hour
- **Dependencies:** Tasks 5.1, 1.3 (OpenAI embeddings)
- **Acceptance Criteria:**
  - [ ] Takes query string as input
  - [ ] Generates embedding for query
  - [ ] Searches Supabase pgvector
  - [ ] Returns top-5 results ranked by similarity
  - [ ] Includes similarity score
  - [ ] Handles empty results gracefully

**File: `src/lib/search/semantic.ts`**
(See corrected-implementation-guide.md)

---

### Task 6.2: Create Document Search Server Action
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 45 min
- **Dependencies:** Task 6.1
- **Acceptance Criteria:**
  - [ ] Can search documents by query
  - [ ] Returns ranked results
  - [ ] User can see similarity scores
  - [ ] Can filter by document type

---

### Task 6.3: Create Document Selector Component (Analysis)
- **Owner:** Full-Stack Engineer #2
- **Estimated Time:** 2 hours
- **Dependencies:** Tasks 6.1, 6.2
- **Acceptance Criteria:**
  - [ ] User can enter search query
  - [ ] Displays search results with similarity %
  - [ ] User can checkbox-select documents
  - [ ] Shows selected count
  - [ ] "Run Analysis" button enabled when docs selected
  - [ ] Loading states work
  - [ ] Error messages clear

**File: `src/components/analysis/DocumentSelector.tsx`**
(See corrected-implementation-guide.md)

---

### Task 6.4: Test Semantic Search
- **Owner:** QA
- **Estimated Time:** 1.5 hours
- **Dependencies:** Tasks 6.1-6.3
- **Acceptance Criteria:**
  - [ ] Search returns relevant documents
  - [ ] Similarity scores make sense
  - [ ] Top result is most similar
  - [ ] Search handles no results
  - [ ] Can select and deselect docs
  - [ ] Form validation works

---

### Task 6.5: Create Document Search UI Page
- **Owner:** Full-Stack Engineer #2
- **Estimated Time:** 1 hour
- **Dependencies:** Tasks 6.1-6.4
- **Acceptance Criteria:**
  - [ ] Standalone search page
  - [ ] Can search all team documents
  - [ ] Shows results ranked
  - [ ] Can filter by type
  - [ ] Results show metadata

**File: `src/app/[lang]/documents/search/page.tsx`**

---

### End of Days 7-8 Checklist
- [ ] Semantic search fully functional
- [ ] Document selector component working
- [ ] Search results display correctly
- [ ] All tests passing
- [ ] Deployed to staging

**By EOD Day 8:** Semantic search working. Can query and select documents.

---

## 🔄 Days 9-10: Analysis Module & n8n Integration

### Task 7.1: Create Trigger Analysis Server Action
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 1.5 hours
- **Dependencies:** Tasks 4.1, 6.1, 1.4 (n8n)
- **Acceptance Criteria:**
  - [ ] Takes projectId + selectedDocuments as input
  - [ ] Creates analysis_results record
  - [ ] Sends webhook to n8n
  - [ ] Handles n8n failures gracefully
  - [ ] Returns analysisId
  - [ ] Audit log created

**File: `src/app/[lang]/projects/[id]/analysis/actions.ts`**
(See corrected-implementation-guide.md)

---

### Task 7.2: Create n8n Webhook Client
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 45 min
- **Dependencies:** Task 7.1
- **Acceptance Criteria:**
  - [ ] Calls n8n webhook
  - [ ] Sends correct payload
  - [ ] Handles timeouts
  - [ ] Handles errors

**File: `src/lib/n8n/client.ts`**
```typescript
export async function triggerN8nWorkflow(payload: {
  projectId: string
  projectName: string
  analysisId: string
  selectedDocuments: Array<{
    id: string
    filename: string
    originalFileUrl: string
    documentType: string
  }>
  webhookUrl: string
}) {
  const response = await fetch(process.env.N8N_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    timeout: 30000, // 30 second timeout
  })

  if (!response.ok) {
    throw new Error(`n8n webhook failed: ${response.statusText}`)
  }

  return response.json()
}
```

---

### Task 7.3: Create n8n Webhook Receiver
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 1 hour
- **Dependencies:** Task 7.2
- **Acceptance Criteria:**
  - [ ] Receives webhook from n8n
  - [ ] Validates payload (analysisId, projectId)
  - [ ] Updates analysis_results with ZIP URL
  - [ ] Updates status to "completed" or "failed"
  - [ ] Revalidates project page
  - [ ] Returns 200 OK

**File: `src/app/api/webhooks/n8n/route.ts`**
(See corrected-implementation-guide.md)

---

### Task 7.4: Create n8n Workflow (Template)
- **Owner:** DevOps / Tech Lead
- **Estimated Time:** 2 hours
- **Dependencies:** Task 1.4 (n8n instance)
- **Acceptance Criteria:**
  - [ ] Workflow receives webhook
  - [ ] Downloads PDFs from Vercel Blob
  - [ ] Calls Python script to annotate
  - [ ] Creates ZIP file
  - [ ] Uploads ZIP to Vercel Blob
  - [ ] Sends webhook response back to Next.js
  - [ ] Handles errors gracefully

**n8n Workflow Steps:**
1. Webhook (listen)
2. Extract variables
3. Loop through documents
   - Download PDF
   - Run Python annotation script
   - Upload annotated PDF
4. Create ZIP file
5. Upload ZIP to Vercel
6. Send webhook response

**n8n Pseudo-code:**
(See revised-analysis-architecture.md for detailed workflow)

---

### Task 7.5: Create Python PDF Annotation Script
- **Owner:** DevOps / Tech Lead (can run in n8n)
- **Estimated Time:** 2 hours
- **Dependencies:** Task 7.4
- **Acceptance Criteria:**
  - [ ] Takes PDF file as input
  - [ ] Extracts text from PDF
  - [ ] Identifies matching sections
  - [ ] Adds annotations/highlights
  - [ ] Saves annotated PDF
  - [ ] Returns metadata

**Python Script: `scripts/annotate_pdf.py`**
```python
import PyPDF2
import pdfplumber
from io import BytesIO
import json
import re

def annotate_pdf(pdf_binary, search_terms):
    """
    Takes a PDF file and search terms
    Returns annotated PDF + metadata
    """
    pdf_file = BytesIO(pdf_binary)
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    pdf_writer = PyPDF2.PdfWriter()
    
    annotated_pages = []
    
    # Extract text and find matches
    for page_num, page in enumerate(pdf_reader.pages):
        text = page.extract_text()
        pdf_writer.add_page(page)
        
        # Search for terms
        for term in search_terms:
            if term.lower() in text.lower():
                annotated_pages.append({
                    "page": page_num + 1,
                    "term": term,
                    "section": text[:100]  # First 100 chars
                })
    
    # Write annotated PDF
    output_pdf = BytesIO()
    pdf_writer.write(output_pdf)
    
    return {
        "pdf_binary": output_pdf.getvalue(),
        "annotated_pages": annotated_pages,
        "total_matches": len(annotated_pages)
    }
```

---

### Task 7.6: Test Analysis & n8n Integration
- **Owner:** QA
- **Estimated Time:** 2 hours
- **Dependencies:** Tasks 7.1-7.5
- **Acceptance Criteria:**
  - [ ] Can trigger analysis from UI
  - [ ] Analysis status shows "processing"
  - [ ] n8n webhook received correctly
  - [ ] n8n workflow executes
  - [ ] ZIP file created
  - [ ] ZIP uploaded to Vercel
  - [ ] Analysis status updates to "completed"
  - [ ] ZIP can be downloaded
  - [ ] Error handling works

**Integration Test:**
```bash
# 1. Create test project
# 2. Attach document (ETT)
# 3. Select documents for analysis
# 4. Trigger analysis
# 5. Wait for n8n processing (5-10 min)
# 6. Verify ZIP download works
# 7. Extract ZIP and verify PDFs
```

---

### End of Days 9-10 Checklist
- [ ] Trigger analysis action working
- [ ] n8n webhook integration complete
- [ ] n8n PDF annotation workflow complete
- [ ] Webhook receiver processing ZIP URLs
- [ ] Analysis results displaying correctly
- [ ] All tests passing
- [ ] Deployed to staging

**By EOD Day 10:** Full analysis workflow complete. Can trigger analysis and receive annotated PDFs.

---

## 📌 Days 11-12: Document-Project Linking & Polish

### Task 8.1: Create Attach Documents Server Action
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 45 min
- **Dependencies:** Task 4.1
- **Acceptance Criteria:**
  - [ ] Can attach document to project
  - [ ] Prevents duplicate attachments
  - [ ] Creates audit log
  - [ ] Updates project UI

**File: `src/app/[lang]/projects/[id]/actions.ts`** (extended)

---

### Task 8.2: Create Attach Documents Dialog Component
- **Owner:** Full-Stack Engineer #2
- **Estimated Time:** 1 hour
- **Dependencies:** Task 8.1
- **Acceptance Criteria:**
  - [ ] Shows list of team documents
  - [ ] Can checkbox-select multiple docs
  - [ ] "Attach Selected" button
  - [ ] Success message on attach

**File: `src/components/projects/AttachDocumentsDialog.tsx`**

---

### Task 8.3: Update Project Detail Page
- **Owner:** Full-Stack Engineer #2
- **Estimated Time:** 1 hour
- **Dependencies:** Tasks 8.1, 8.2
- **Acceptance Criteria:**
  - [ ] Shows "Attached Documents" section
  - [ ] Lists attached documents
  - [ ] Can remove attachment
  - [ ] "Attach More Documents" button
  - [ ] Shows document type and upload date

---

### Task 8.4: Create Analysis Results Display Component
- **Owner:** Full-Stack Engineer #2
- **Estimated Time:** 1 hour
- **Dependencies:** Task 7.6
- **Acceptance Criteria:**
  - [ ] Shows analysis status (pending/processing/completed/failed)
  - [ ] Shows loading spinner while processing
  - [ ] Shows ZIP download link when completed
  - [ ] Shows error message if failed
  - [ ] Auto-refreshes every 5 seconds while processing

**File: `src/components/analysis/AnalysisResults.tsx`**
(See corrected-implementation-guide.md)

---

### Task 8.5: Create Project Analysis Page
- **Owner:** Full-Stack Engineer #2
- **Estimated Time:** 1 hour
- **Dependencies:** Tasks 6.3, 8.3, 8.4
- **Acceptance Criteria:**
  - [ ] Shows DocumentSelector component
  - [ ] Shows AnalysisResults component
  - [ ] Can run multiple analyses
  - [ ] Shows history of analyses

**File: `src/app/[lang]/projects/[id]/analysis/page.tsx`**

---

### Task 8.6: Setup i18n (Internationalization)
- **Owner:** Full-Stack Engineer #1
- **Estimated Time:** 1.5 hours
- **Dependencies:** Task 1.4 (middleware)
- **Acceptance Criteria:**
  - [ ] Routes work with `/en/` and `/es/` prefixes
  - [ ] Translations for all UI text
  - [ ] Language switcher works
  - [ ] hreflang tags in metadata
  - [ ] Locale stored in database per user

**Files:**
- `src/lib/i18n/routing.ts`
- `src/lib/i18n/messages/en.json`
- `src/lib/i18n/messages/es.json`
- `src/middleware.ts` (updated)
- `src/components/common/LanguageSwitcher.tsx`

---

### Task 8.7: Setup SEO & Metadata
- **Owner:** Tech Lead / Full-Stack Engineer #1
- **Estimated Time:** 1 hour
- **Dependencies:** Task 8.6
- **Acceptance Criteria:**
  - [ ] All pages have unique titles
  - [ ] All pages have descriptions
  - [ ] Open Graph tags working
  - [ ] Twitter cards configured
  - [ ] JSON-LD schema on homepage
  - [ ] robots.txt configured
  - [ ] sitemap.xml generating

**Files:**
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/app/layout.tsx` (metadata)
- `src/app/[lang]/page.tsx` (generate metadata)

---

### Task 8.8: Accessibility Audit
- **Owner:** QA / Full-Stack Engineer
- **Estimated Time:** 1.5 hours
- **Dependencies:** All UI components
- **Acceptance Criteria:**
  - [ ] Skip navigation link works
  - [ ] All inputs have labels
  - [ ] Focus outlines visible
  - [ ] Color contrast ≥4.5:1
  - [ ] Form errors announced
  - [ ] Keyboard navigation works
  - [ ] Screen reader friendly

**Manual Audit:**
```bash
# 1. Tab through entire app
# 2. Test with screen reader (NVDA on Windows, VoiceOver on Mac)
# 3. Check colors with contrast checker
# 4. Run Lighthouse audit (target 90+)
```

---

### End of Days 11-12 Checklist
- [ ] Document-project linking complete
- [ ] Analysis results display working
- [ ] i18n fully functional (EN/ES)
- [ ] SEO metadata complete
- [ ] Accessibility audit passed
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Deployed to staging

**By EOD Day 12:** Full feature-complete MVP. Ready for final polish.

---

## ✨ Days 13-14: Testing & Final Deployment

### Task 9.1: Unit Tests (React Testing Library)
- **Owner:** QA
- **Estimated Time:** 2 hours
- **Dependencies:** All components
- **Acceptance Criteria:**
  - [ ] DocumentUploader tests
  - [ ] DocumentSelector tests
  - [ ] ProjectForm tests
  - [ ] ProjectPipeline tests
  - [ ] 80%+ code coverage

**Test File: `src/components/documents/DocumentUploader.test.tsx`**
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentUploader } from './DocumentUploader'

describe('DocumentUploader', () => {
  it('renders upload form', () => {
    render(<DocumentUploader />)
    expect(screen.getByText(/upload/i)).toBeInTheDocument()
  })

  it('disables submit when no file selected', () => {
    render(<DocumentUploader />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('shows error on invalid file type', async () => {
    render(<DocumentUploader />)
    const input = screen.getByRole('button')
    fireEvent.change(input, { target: { files: [new File([], 'test.txt')] } })
    // Should show error
  })
})
```

---

### Task 9.2: E2E Tests (Playwright)
- **Owner:** QA
- **Estimated Time:** 2 hours
- **Dependencies:** All features
- **Acceptance Criteria:**
  - [ ] Upload document test
  - [ ] Create project test
  - [ ] Attach document test
  - [ ] Trigger analysis test
  - [ ] Download ZIP test
  - [ ] All tests pass in CI

**Test File: `tests/e2e/full-workflow.spec.ts`**
```typescript
import { test, expect } from '@playwright/test'

test('full workflow: upload → create project → analyze → download', async ({ page }) => {
  // Sign in
  await page.goto('/en')
  await page.fill('input[type="email"]', 'test@example.com')
  // ... etc

  // Upload document
  // Create project
  // Attach document
  // Trigger analysis
  // Wait for completion
  // Download ZIP
  // Verify file exists

  expect(true).toBe(true) // Replace with real assertions
})
```

---

### Task 9.3: Performance Testing & Optimization
- **Owner:** Tech Lead
- **Estimated Time:** 1.5 hours
- **Dependencies:** All features deployed
- **Acceptance Criteria:**
  - [ ] LCP < 2.5s
  - [ ] INP < 200ms
  - [ ] CLS < 0.1
  - [ ] Lighthouse score >90
  - [ ] Mobile score >80

**Test:**
```bash
# Run locally
npm run build
npm run start

# Test with Lighthouse
# Test with PageSpeed Insights
# Test with webpagetest.org
```

**Common Optimizations:**
- [ ] next/image for all images
- [ ] next/font for fonts
- [ ] Code splitting with next/dynamic
- [ ] Suspense boundaries for slow data

---

### Task 9.4: Security Audit
- **Owner:** Tech Lead / DevOps
- **Estimated Time:** 1 hour
- **Dependencies:** All code
- **Acceptance Criteria:**
  - [ ] No hardcoded secrets
  - [ ] HTTPS everywhere
  - [ ] CORS configured
  - [ ] RLS policies verified
  - [ ] SQL injection prevented
  - [ ] XSS prevention in place

**Checklist:**
- [ ] Environment variables not in code
- [ ] API keys properly rotated
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Input validation everywhere
- [ ] Dependencies audited (`npm audit`)

---

### Task 9.5: Final QA & Bug Fixes
- **Owner:** QA
- **Estimated Time:** 2 hours
- **Dependencies:** Tasks 9.1-9.4
- **Acceptance Criteria:**
  - [ ] No critical bugs
  - [ ] All tests passing
  - [ ] Performance targets met
  - [ ] Security audit passed
  - [ ] Browser compatibility tested

**Testing Checklist:**
- [ ] Chrome latest
- [ ] Firefox latest
- [ ] Safari latest
- [ ] Mobile Safari (iPhone)
- [ ] Chrome Mobile (Android)

---

### Task 9.6: Final Documentation
- **Owner:** Tech Lead
- **Estimated Time:** 1 hour
- **Dependencies:** All tasks
- **Acceptance Criteria:**
  - [ ] README updated
  - [ ] CONTRIBUTING guide created
  - [ ] API documentation complete
  - [ ] Deployment guide created
  - [ ] Troubleshooting guide created

**Files:**
- `README.md` — Project overview
- `CONTRIBUTING.md` — How to contribute
- `docs/API.md` — API reference
- `docs/DEPLOYMENT.md` — How to deploy
- `docs/TROUBLESHOOTING.md` — Common issues

---

### Task 9.7: Final Deployment to Production
- **Owner:** DevOps / Tech Lead
- **Estimated Time:** 1 hour
- **Dependencies:** Tasks 9.1-9.6
- **Acceptance Criteria:**
  - [ ] All code merged to main
  - [ ] Vercel deployment successful
  - [ ] Supabase backups enabled
  - [ ] Monitoring configured
  - [ ] Uptime monitoring active
  - [ ] Error tracking (Sentry) active

**Deploy Checklist:**
```bash
# 1. Verify all tests pass in CI
# 2. Review code coverage
# 3. Merge PRs to main
# 4. Vercel auto-deploys
# 5. Test production URLs
# 6. Monitor logs for errors
# 7. Verify Supabase backups
# 8. Test all critical paths
```

---

### Task 9.8: Create Deployment Runbook
- **Owner:** DevOps
- **Estimated Time:** 45 min
- **Dependencies:** Task 9.7
- **Acceptance Criteria:**
  - [ ] Step-by-step deployment guide
  - [ ] Rollback procedures documented
  - [ ] Incident response plan created
  - [ ] Team trained on deployment

---

### End of Days 13-14 Checklist
- [ ] All unit tests passing
- [ ] All E2E tests passing
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] Final QA complete
- [ ] Documentation complete
- [ ] Deployed to production
- [ ] Monitoring active
- [ ] Team trained

**By EOD Day 14:** Production-ready POC deployed. Ready for client handoff.

---

## 📊 Post-Launch (Week 3-4)

### Task 10.1: Monitoring & Incident Response
- **Owner:** DevOps
- **Time:** Ongoing
- **Acceptance Criteria:**
  - [ ] Sentry errors monitored
  - [ ] Uptime monitoring (Pingdom)
  - [ ] Performance monitoring (Vercel Analytics)
  - [ ] Slack alerts configured
  - [ ] Incident response team trained

---

### Task 10.2: User Testing & Feedback
- **Owner:** Product / Tech Lead
- **Time:** Week 3
- **Acceptance Criteria:**
  - [ ] User testing session completed
  - [ ] Feedback collected
  - [ ] Bugs logged
  - [ ] Feature requests documented

---

### Task 10.3: Case Study & Documentation
- **Owner:** Tech Lead / Product
- **Time:** Week 3-4
- **Acceptance Criteria:**
  - [ ] Metrics documented
  - [ ] Screenshots/videos captured
  - [ ] Case study written
  - [ ] Published to ibudi site

---

### Task 10.4: Team Handoff & Knowledge Transfer
- **Owner:** Tech Lead
- **Time:** Week 4
- **Acceptance Criteria:**
  - [ ] Code walkthrough completed
  - [ ] Deployment procedures trained
  - [ ] Troubleshooting guide reviewed
  - [ ] Support processes established

---

## 🎯 Testing Strategy

### Unit Tests (React Testing Library)
```
Target: 80%+ code coverage
Focus: Business logic, form validation, edge cases
Time: Ongoing (sprint)
```

### Integration Tests
```
Target: All critical paths
Focus: Server Actions, database queries, auth
Time: Days 9-10
```

### E2E Tests (Playwright)
```
Target: 5+ user journeys
Focus: Upload → Project → Analysis → Download
Time: Days 9-10
```

### Manual Testing
```
Target: Browser compatibility, accessibility
Focus: Cross-browser, keyboard navigation, screen readers
Time: Day 13
```

---

## 📋 Deployment Checklist

```
BEFORE DEPLOYMENT:
□ All tests passing (unit, integration, E2E)
□ Code reviewed and approved
□ Performance audit completed
□ Security audit completed
□ Accessibility audit passed
□ No TypeScript errors
□ No ESLint warnings
□ Database backups enabled
□ Monitoring configured
□ Error tracking (Sentry) configured
□ Environment variables set in Vercel

DURING DEPLOYMENT:
□ Merge to main branch
□ Verify Vercel build completes
□ Verify no deployment errors
□ Smoke tests pass
□ All URLs accessible

AFTER DEPLOYMENT:
□ Monitor Sentry for errors
□ Check performance metrics
□ Verify database connectivity
□ Test critical paths manually
□ Check logs for warnings
□ Monitor uptime
□ Team notified of deployment
```

---

## ⚠️ Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| n8n workflow fails | Medium | High | Test workflow daily, have fallback |
| OpenAI API rate limit | Low | Medium | Set usage limits, queue requests |
| Supabase outage | Low | Critical | Have backup auth method, geo-redundancy |
| PDF annotation bugs | Medium | Medium | Python testing, manual QA |
| Deployment issues | Medium | High | Staging environment, rollback plan |
| Performance degradation | Low | Medium | Monitor Core Web Vitals, optimize |

---

## 📞 Support & Escalation

```
Issues:
┌─────────────────────────┐
│ Slack: #docs-analysis   │
│ Jira: [Project Key]     │
│ On-Call: [Schedule]     │
└─────────────────────────┘

Escalation:
Critical Bug → Tech Lead → CTO
Performance Issue → DevOps → Tech Lead
Feature Request → Product → Tech Lead
```

---

## 🎉 Success Criteria (POC Completion)

✅ **Functional:**
- Projects CRUD working
- Documents upload → embeddings
- Semantic search functioning
- Analysis workflow (UI → n8n → ZIP)
- Document-project linking

✅ **Technical:**
- TypeScript strict mode
- Server Components architecture
- Supabase pgvector search
- OpenAI embeddings
- n8n workflow automation

✅ **Quality:**
- 80%+ test coverage
- All E2E tests passing
- Performance targets met
- Security audit passed
- Accessibility compliant

✅ **Operations:**
- Deployed to production
- Monitoring active
- Error tracking working
- Team trained
- Documentation complete

---

**🎯 Target:** Full POC shipped, tested, and ready for client review by EOD Day 14.

**🚀 Next Phase:** Case study → Sales pipeline → Scale to 10+ clients.

---

**Document Version:** 1.0  
**Last Updated:** May 30, 2026  
**Owner:** Tech Lead  
**Status:** Ready for Sprint
