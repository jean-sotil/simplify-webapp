# Project: Simplify — Intelligent Document Analysis Platform

A 14-day POC for an enterprise client (ibudi). The platform unifies project lifecycle management with AI-powered document intelligence. Users create projects, upload PDF documents (ETT specs and Hardware Inventory), and trigger an n8n-orchestrated analysis workflow that extracts requirements from ETT documents, runs semantic search against a vector-indexed knowledge base, and returns actionable recommendations. Stack: Next.js 16.2.6 App Router, React 19, Supabase (Postgres + auth + RLS), OpenRouter (via the OpenAI SDK) for LLM and embeddings, Vercel Blob for file storage, n8n for workflow orchestration, TailwindCSS v4, Zod v4. Deployed to Vercel.

---

## Tech Stack

| Layer | Tool | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.6 |
| UI Runtime | React | 19.2.4 |
| Language | TypeScript | ^5 (strict mode) |
| Styling | TailwindCSS | ^4 (PostCSS plugin) |
| Database / Auth | Supabase (`@supabase/supabase-js`) | ^2.106.2 |
| File Storage | Vercel Blob (`@vercel/blob`) | ^2.4.0 |
| Data Fetching | TanStack React Query | ^5.100.14 |
| Validation | Zod | ^4.4.3 |
| AI / LLM | OpenAI SDK (pointing to OpenRouter) | ^6.39.1 |
| PDF Processing | `pdfjs-dist` | ^5.6.205 |
| Identifiers | `uuid` | ^14.0.0 |
| i18n | `next-intl` | ^4.13.0 |
| Linting | ESLint 9 + `eslint-config-next` | ^9 / 16.2.6 |
| Formatting | Prettier | ^3.8.3 |
| Package manager | npm | — |

---

## Design System & Visual Rules

This project implements a faithful interpretation of Webflow's design language. All UI work must conform to the tokens defined in `DESIGN.md`. The rules below are hard constraints — no exceptions.

**Primary Constraint:** The near-black `#080808` is the only valid primary CTA background. Chromatic accents are surface fills on category cards, never button backgrounds.

### Color Tokens (mandatory CSS variable names)
- `--color-primary: #080808` — every heading, wordmark, primary CTA background
- `--color-on-primary: #ffffff`
- `--color-canvas: #ffffff` — default page background
- `--color-hairline: #d8d8d8` — all 1px borders (inputs, cards, dividers)
- `--color-ink: #080808` — default text
- `--color-body: #363636` — body paragraphs
- `--color-body-mid: #5a5a5a` — footer, secondary text
- `--color-mute: #898989` — lower-priority text
- `--color-mute-soft: #ababab` — placeholder text
- `--color-accent-purple: #7a3dff`
- `--color-accent-pink: #ed52cb`
- `--color-accent-blue: #3b89ff`
- `--color-accent-blue-info: #146ef5` — info badges only
- `--color-accent-orange: #ff6b00`
- `--color-accent-green: #00d722`
- `--color-accent-yellow: #ffae13` — warnings
- `--color-accent-red: #ee1d36` — errors/destructive

### Typography Rules
- Single font family: **WF Visual Sans Variable** → fallback `Inter, system-ui, sans-serif`
- Monospace: **WFVisualSans-Mono** → fallback `Inconsolata, ui-monospace`
- Weight ceiling: **600**. Never use 700, 800, or 900.
- Hero headline: 80px / weight 600 / line-height 83.2px / letter-spacing -0.8px
- Section headline: 44.8px / weight 600
- Body default: 16px / weight 400 / line-height 25.6px / letter-spacing -0.16px
- Eyebrow labels: 15px / weight 500 / UPPERCASE / letter-spacing 1.5px (mandatory on all section headers)
- Button labels: 16px / weight 500

### Spacing Tokens
Base unit is 4px. Tokens: `xxs=2px xs=4px sm=8px md=12px lg=16px xl=20px 2xl=24px 3xl=32px`.

### Border Radius Scale
- `rounded-none` (0) — full-bleed bands
- `rounded-xs` (2px)
- `rounded-sm` (4px) — buttons, badges, inputs
- `rounded-md` (8px) — all cards
- `rounded-full` (9999px) — circular icon containers only. Never use on CTAs.

### Elevation
- Level 0: no shadow (default bands)
- Level 1: 1px solid `var(--color-hairline)` (card chrome, inputs)
- Level 2: `0 84px 24px rgba(0,0,0,0), 0 54px 22px rgba(0,0,0,.01), 0 30px 18px rgba(0,0,0,.04), 0 13px 13px rgba(0,0,0,.08), 0 3px 7px rgba(0,0,0,.09)` — featured cards
- Level 4: `0 24px 24px rgba(0,0,0,.26), 0 6px 13px rgba(0,0,0,.29)` — modals/dialogs

### Component Constraints
- `button-primary`: bg `#080808`, text white, padding `12px 20px`, radius 4px
- `button-secondary`: bg white, text `#080808`, 1px `#d8d8d8` border, same padding/radius
- `text-input`: bg white, text `#080808`, 1px `#d8d8d8` border, padding `12px 16px`, radius 4px
- Category cards (purple/pink/blue/orange/green): full-fill accent bg, radius 8px, padding 32px
- `category-card-green` uses `#080808` ink text (not white) for legibility

### Responsive Breakpoints
- Mobile: <479px (1-up grids, stacked hero)
- Tablet: 768–991px (2-up grids)
- Desktop: ≥992px (full multi-up grids)

See `DESIGN.md` for the full token spec.

---

## Directory Structure

```
src/
  app/                    # Next.js App Router root
    [lang]/               # i18n dynamic segment (EN/ES via next-intl)
      projects/           # Projects module pages
      documents/          # Documents module pages
    api/
      webhooks/
        n8n/              # Incoming n8n webhook handler
    layout.tsx            # Root layout
    page.tsx              # Root page
    globals.css           # TailwindCSS base + CSS variables
  components/
    analysis/             # Analysis trigger + results UI
    common/               # Shared primitives (buttons, inputs, badges)
    documents/            # Document upload, list, search UI
    layout/               # Nav, footer, shell layout components
    projects/             # Project CRUD, stage pipeline UI
  constants/              # App-wide constants (stage labels, limits, etc.)
  lib/
    ai/
      openai.ts           # OpenAI-compatible client (OpenRouter), embeddings
    auth.ts               # Supabase auth helpers (getSession, getUser)
    db.ts                 # Supabase client singletons (public + admin)
    i18n/                 # next-intl config and message loaders
    n8n/                  # n8n webhook dispatch helpers
    search/               # Semantic search logic (vector queries)
    utils/                # General-purpose utility functions
    validation/
      schemas.ts          # All Zod schemas (single source of truth)
  types/                  # Shared TypeScript type definitions
```

---

## Development Commands

```bash
npm run dev      # Start Next.js dev server (localhost:3000)
npm run build    # Production build (runs tsc + next build)
npm run start    # Start production server (after build)
npm run lint     # Run ESLint across all .ts/.tsx files
```

There is no dedicated `test` script yet — testing infrastructure (task forthcoming) will use Vitest + Playwright per the project's TDD mandate.

---

## Code Conventions

### TypeScript
- `strict: true` is non-negotiable. All flags are on: `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`.
- No `any`. Use `unknown` + type narrowing instead.
- Import alias `@/*` resolves to `src/*`. Always use `@/` for cross-directory imports.
- `moduleResolution: "bundler"` — no `.js` extensions needed on relative imports.
- Export inferred types from Zod schemas via `z.infer<typeof Schema>`. Do not hand-write duplicate types.

### Components
- File naming: PascalCase for component files (`ProjectCard.tsx`), kebab-case for route segments (`[lang]/projects`).
- One component per file unless the secondary component is a trivial internal sub-component.
- Co-locate component-specific hooks and types in the same directory as the component.
- Server Components are the default in the App Router. Add `'use client'` only when browser APIs or React state are required.
- Props interfaces are named `[ComponentName]Props` and defined in the same file.

### Styling
- TailwindCSS v4 utility classes are the primary styling method.
- Design token CSS variables (from `DESIGN.md`) are declared in `globals.css` and consumed via Tailwind's `theme()` or directly in inline styles for one-off cases.
- Never hardcode hex colors inline — always use CSS variables.
- `printWidth: 100` (from Prettier) governs JSX line length.
- Responsive classes follow mobile-first: `sm:` `md:` `lg:` at the breakpoints defined in `DESIGN.md`.

### Data & Validation
- All Zod schemas live in `src/lib/validation/schemas.ts`. Do not create schema files elsewhere.
- Validate every external input (API route body, form data, URL params) at the entry point using the appropriate schema.
- Max file upload size is 50 MB. Only `application/pdf` files are accepted (`DocumentUploadSchema`).
- `ProjectStage` enum values: `initiation | planning | docs_analysis | development | deployment | completed`.
- `DocumentType` enum values: `ett | hardware`.

### API Routes
- Use Next.js App Router Route Handlers (`route.ts` files inside `app/api/`).
- Parse and validate request bodies with Zod before any business logic.
- Return structured error responses — never raw error strings. Shape: `{ error: string, details?: unknown }`.
- The `supabaseAdmin` client (bypasses RLS) must never be used in client components or API routes called from the browser without server-side ownership verification.
- Use `supabase` (anon key) for browser-facing data access — RLS is the security boundary.

---

## Environment Variables

| Variable | Description | Secret |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public base URL (e.g. `http://localhost:3000`) | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key — bypasses RLS | YES |
| `OPENAI_API_KEY` | OpenRouter API key (`sk-or-...`) | YES |
| `OPENAI_BASE_URL` | Must be `https://openrouter.ai/api/v1` | No |
| `N8N_WEBHOOK_URL` | Full n8n webhook URL including workflow ID | YES |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token | YES |
| `SENTRY_DSN` | Sentry error tracking DSN | YES |

All variables are validated at module load time in their respective singleton files (`db.ts`, `openai.ts`). The app crashes on startup if a required variable is absent — this is intentional.

---

## Testing

No test runner is configured yet. When added, the project follows the TDD mandate:

- Framework: **Vitest** (unit + integration) and **Playwright** (E2E)
- Tests live adjacent to the code they test or in a `__tests__/` subdirectory
- The Red-Green-Refactor cycle is mandatory: write a failing test, observe the failure, then implement
- No production code may be committed without a corresponding test
- Coverage target: 80% minimum for `src/lib/` modules

---

## Git & Commits

Commit messages follow the Conventional Commits spec observed in the repo history:

```
feat:   new capability
fix:    bug fix
chore:  tooling, config, scaffolding
docs:   documentation only
refactor: code change without behavior change
```

Branch naming: `feature/<short-description>` or `fix/<short-description>`.

---

## Deployment

- **Platform:** Vercel
- **Project:** `jean-paul-sotil-pastors-projects/simplify-webapp`
- **Production URL:** https://simplify-webapp-jean-paul-sotil-pastors-projects.vercel.app
- **Deployment ID (first deploy):** `dpl_9xp2uHHwikYp4nFNKRbeKG11sZsm`
- Note: Deployment Protection (SSO) is enabled by default on this team plan. Disable it in Vercel → Settings → Deployment Protection for public access.
- Build command: `next build` (auto-detected by Vercel)
- Output directory: `.next`

---

## Architectural Constraints

The following are hard prohibitions derived from the design spec, TypeScript config, and project patterns.

1. Do not use `any` type. No exceptions.
2. Do not use `supabaseAdmin` in browser-facing code or client components. Server-only.
3. Do not create Zod schemas outside `src/lib/validation/schemas.ts`.
4. Do not use chromatic accent colors (`#7a3dff`, `#ed52cb`, `#3b89ff`, `#ff6b00`, `#00d722`) as button backgrounds. They are card surface fills only.
5. Do not use pill-shaped CTAs (`border-radius: 9999px`) on buttons. Buttons use `rounded-sm` (4px).
6. Do not use font weights above 600. The design system has a hard ceiling at semibold.
7. Do not introduce a sixth accent color. The 5-stop palette (`purple / pink / blue / orange / green`) is the complete system.
8. Do not use `console.log` in production code. ESLint enforces a warning on this; only `console.warn` and `console.error` are permitted.
9. Do not store secrets in `NEXT_PUBLIC_*` variables. Public variables are shipped to the browser bundle.
10. Do not use `OFFSET/LIMIT` pagination on large Supabase tables. Use cursor-based pagination.
11. Do not bypass Row Level Security by using `supabaseAdmin` for user-owned data reads.
12. Do not add dependencies without checking `npm audit`. Supply chain hygiene is mandatory.

---

## AI/LLM Integration Notes

- The OpenAI SDK (`src/lib/ai/openai.ts`) points to **OpenRouter** (`OPENAI_BASE_URL=https://openrouter.ai/api/v1`), not OpenAI directly. The `OPENAI_API_KEY` must be an OpenRouter key (`sk-or-...`).
- Embedding model: `text-embedding-3-large` (1536-dimension vectors). Do not change the model without updating the Supabase vector column dimensions.
- Two helper functions are exported: `generateEmbedding(text)` for single inputs and `generateEmbeddingsBatch(texts[])` for bulk operations. Always use the batch variant when processing multiple documents.
- The n8n webhook (`N8N_WEBHOOK_URL`) receives a structured payload: `{ projectId, projectName, ettDocumentUrl, selectedDocuments: SelectedDocument[] }`. Validate the full payload against `SelectedDocumentSchema` before dispatch.
- LLM outputs returned from n8n must be validated and sanitized server-side before being stored in Supabase or rendered in the UI.
- All AI API calls must be wrapped in rate-limiting logic before going to production to prevent cost overruns. The OpenRouter spending cap recommendation is $100/month.
