# POC_TASKS — Intelligent Document Analysis Platform
**Source documents:** docs-analysis-prd.md, revised-analysis-architecture.md, corrected-implementation-guide.md  
**Stack:** Next.js 15 (App Router), TypeScript strict, Supabase (PostgreSQL + pgvector), OpenAI Embeddings, Vercel Blob, n8n, Tailwind + shadcn/ui, next-intl  
**Architecture note:** Requirement extraction (GPT-4) is NOT in the webapp. The webapp handles embeddings only. n8n handles PDF annotation via Python. This is the authoritative flow per `revised-analysis-architecture.md`.

---

## Phase 0 — Pre-Sprint Infrastructure

**Goal:** All external services provisioned and credentials confirmed before a single line of app code is written.

1. **Create GitHub repository** — Initialize repo `docs-analysis`, enable branch protection (require PR review on `main`), add `.gitignore` (exclude `.env.local`, `.next/`, `node_modules/`), add `.env.example` with placeholder keys. Acceptance: team can clone and push feature branches.

2. **Provision Supabase project** — Create project at supabase.com, enable the `vector` extension via SQL editor (`CREATE EXTENSION IF NOT EXISTS vector`), generate and securely store the three keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Acceptance: can connect from Node and run a `SELECT 1`.

3. **Configure OpenAI API key** — Create a restricted API key at platform.openai.com, set a $100/month spending cap, verify it can call `text-embedding-3-large`. Acceptance: test embedding call returns a 1536-dimension vector.

4. **Provision n8n instance** — Deploy n8n (Cloud or self-hosted Docker). Confirm Python 3.9+ is available in the execution environment. Generate a webhook URL that is reachable from the public internet. Acceptance: a manual `POST` to the webhook URL returns a response from n8n.

5. **Enable Vercel Blob storage** — Link the GitHub repo to Vercel, enable Blob on the project, generate `BLOB_READ_WRITE_TOKEN`. Acceptance: a programmatic `put()` call succeeds and returns a CDN URL.

6. **Compose `.env.local`** — Populate all six required variables: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `N8N_WEBHOOK_URL`, `BLOB_READ_WRITE_TOKEN`. Mirror all variables into the Vercel dashboard environment. Acceptance: no variable is undefined at app startup.

---

## Phase 1 — Next.js Scaffold (Day 1)

**Goal:** A clean Next.js 15 skeleton compiles, passes lint, and deploys to Vercel with no errors.

7. **Bootstrap Next.js project** — Run `create-next-app@latest` with flags: `--typescript --tailwind --eslint --app --src-dir --import-alias '@/*'`. Acceptance: `npm run dev` serves on port 3000.

8. **Install and audit dependencies** — Install: `@supabase/supabase-js`, `@tanstack/react-query`, `next-intl`, `zod`, `@vercel/blob`, `pdfjs-dist`, `openai`, `uuid`. Run `npm audit` — zero critical or high vulnerabilities. Acceptance: `npm run lint` passes with zero errors.

9. **Enforce TypeScript strict mode** — Set `strict: true`, `noImplicitAny: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noImplicitReturns: true`, `strictNullChecks: true` in `tsconfig.json`. Acceptance: `npx tsc --noEmit` exits 0.

10. **Configure ESLint and Prettier** — Extend `next/core-web-vitals`, set `no-console: warn` (allow `warn` and `error`). Configure Prettier with `singleQuote: true`, `semi: false`, `printWidth: 100`. Acceptance: `npm run lint` and `prettier --check .` both pass.

11. **Create directory structure** — Scaffold all folders as specified in the PRD: `src/app/[lang]/projects/`, `src/app/[lang]/documents/`, `src/app/api/webhooks/n8n/`, `src/components/{projects,documents,analysis,layout,common}`, `src/lib/{ai,search,n8n,validation,i18n,utils}`, `src/types/`, `src/constants/`. Acceptance: all paths exist, no TypeScript path alias errors.

12. **Create core library singletons** — Write `src/lib/db.ts` (Supabase client + admin client with startup env validation), `src/lib/auth.ts` (`getSession`, `getUser`), `src/lib/ai/openai.ts` (`generateEmbedding`, `generateEmbeddingsBatch`). Acceptance: importing each file does not throw at module load time.

13. **Create Zod validation schemas** — Write `src/lib/validation/schemas.ts` with `CreateProjectSchema`, `UpdateProjectSchema`, `DocumentUploadSchema` (max 50 MB, `.pdf` only), and `SelectedDocumentSchema`. Infer and export TypeScript types from all schemas. Acceptance: `z.parse()` on valid and invalid fixtures behaves correctly.

14. **Deploy skeleton to Vercel** — Trigger first Vercel deployment. Acceptance: production URL returns HTTP 200, no build errors in Vercel dashboard.

---

## Phase 2 — Database Schema and Authentication (Day 2)

**Goal:** All tables exist, RLS is active, the semantic search SQL function is deployed, and email magic-link auth works locally.

15. **Create all Supabase tables** — Execute the full SQL schema from the PRD (revised by `revised-analysis-architecture.md`) in the Supabase SQL editor. Tables: `teams`, `projects`, `documents`, `project_documents`, `analysis_results` (with `selected_documents JSONB`, `zip_file_url TEXT`, `analysis_metadata JSONB` — NOT `report_url` or `requirements_list`), `audit_logs`. Acceptance: all six tables appear in the Supabase Table Editor.

16. **Create performance indexes** — Execute all `CREATE INDEX` statements: `idx_projects_team_id`, `idx_projects_stage`, `idx_documents_team_id`, `idx_documents_type`, `idx_documents_embedding` (using `ivfflat` with `vector_cosine_ops`, `lists = 100`), `idx_analysis_project_id`, `idx_audit_user_id`. Acceptance: `EXPLAIN ANALYZE` on a join query shows index scans, not sequential scans.

17. **Enable Row-Level Security policies** — Enable RLS on all six tables and write policies: projects and documents are scoped to `team_id` of the authenticated user; analysis_results are scoped to project ownership; audit_logs are scoped to the creating user. Acceptance: a request using the anon key cannot read another team's data.

18. **Deploy `search_documents_semantic` SQL function** — Create the `RETURNS TABLE` function that accepts `query_embedding VECTOR(1536)`, `team_id_param UUID`, optional `doc_type_filter TEXT`, and `match_count INT`. Returns `id`, `filename`, `document_type`, `similarity` (cosine), and `uploaded_at`. Acceptance: calling `supabase.rpc('search_documents_semantic', {...})` with a test vector returns rows ordered by descending similarity.

19. **Configure Supabase Auth** — Enable Email provider with magic-link. Set redirect URLs for `localhost:3000` and the Vercel production domain. Acceptance: sending a magic link to a test email address and clicking it creates a valid session.

20. **Build auth callback route** — Create `src/app/api/auth/callback/route.ts` that exchanges the code for a session and redirects to `/en/projects`. Acceptance: clicking the magic link from email lands on the projects page.

21. **Build sign-in page** — Create `src/app/[lang]/auth/signin/page.tsx` with a controlled email input and OTP trigger. Show a success message ("Check your email") on submit. Show an inline error if the API call fails. Accessibility: input has a label, error is announced via `aria-live`. Acceptance: entire form is operable by keyboard only.

22. **Configure i18n middleware** — Create `src/lib/i18n/routing.ts` using `next-intl/routing` with locales `['en', 'es']`, default `'en'`, and path aliases (`/projects` → `/proyectos` for `es`). Wire `next-intl/middleware` into `src/middleware.ts`. Acceptance: navigating to `/` redirects to `/en/`, and `/es/projects` renders without a 404.

23. **Write database connectivity test script** — Create `scripts/test-db.ts` that inserts a team, queries it, and deletes it using `supabaseAdmin`. Acceptance: `npx ts-node scripts/test-db.ts` exits 0 and prints confirmation.

---

## Phase 3 — Projects Module (Days 3–4)

**Goal:** Full projects CRUD with pipeline stage management and audit logging.

24. **Write Projects Server Actions** — Create `src/app/[lang]/projects/actions.ts` with four actions: `createProject` (validates with `CreateProjectSchema`, inserts, revalidates, writes audit log), `updateProject` (validates with `UpdateProjectSchema`, updates, revalidates, writes audit log), `updateProjectStage` (validates the stage enum, updates, writes audit log), `deleteProject` (cascades, writes audit log). All actions call `requireAuth()` first. Acceptance: each action tested manually produces the correct database row and audit log entry.

25. **Build Projects list page** — Create `src/app/[lang]/projects/page.tsx` as a React Server Component. Fetch all projects for the user's team, sorted by `updated_at DESC`. Display project name, stage badge, owner, and last-updated timestamp. Acceptance: page renders without a `use client` directive; data is fetched server-side.

26. **Build ProjectCard component** — Create `src/components/projects/ProjectCard.tsx`. Displays name, description preview, current stage, and a link to the detail page. Acceptance: renders with correct ARIA roles; stage badge uses semantic color (not just color alone to convey meaning).

27. **Build ProjectForm component** — Create `src/components/projects/ProjectForm.tsx` (`use client`). Handles both create and edit modes. Uses `useFormStatus` for pending state. Validates on client before submission. Every input has an associated `<label>` and `aria-describedby` pointing to its error element. Acceptance: submitting an empty name shows an inline error; submitting valid data calls the Server Action.

28. **Build ProjectPipeline component** — Create `src/components/projects/ProjectPipeline.tsx`. Renders the six stages (Initiation, Planning, Docs Analysis, Development, Deployment, Completed) as a horizontal stepper. The current stage is visually highlighted. Clicking a stage calls `updateProjectStage`. Acceptance: keyboard navigation works; stage change is reflected in the DB within one page reload.

29. **Build Project detail page** — Create `src/app/[lang]/projects/[id]/page.tsx`. Fetch project with attached documents. Render `ProjectPipeline`, project metadata, the list of attached documents, and a link to the analysis sub-page. Acceptance: all data is server-rendered; no client waterfall.

30. **Write Projects Playwright E2E test** — Create `tests/e2e/projects.spec.ts`. Test: sign in, create project "Alpha Test", verify it appears in list, change stage to "planning", verify stage badge updates, delete project, verify it is gone. Acceptance: test passes in CI.

---

## Phase 4 — Documents Module (Days 5–6)

**Goal:** PDF upload pipeline fully functional — file stored in Vercel Blob, text extracted, embedding generated, record persisted in Supabase.

31. **Build PDF text extraction utility** — Create `src/lib/utils/pdf.ts` using `pdfjs-dist`. Extract text page-by-page, prepend each page with a `--- Page N ---` marker, concatenate. Handle corrupted or empty PDFs by throwing a typed error (not swallowing silently). Acceptance: test with a 5-page PDF returns a non-empty string with page markers.

32. **Write Document upload Server Action** — Create `src/app/[lang]/documents/actions.ts`. The `uploadDocument` action: (1) validates file with `DocumentUploadSchema`, (2) streams to Vercel Blob with `access: 'private'` and `addRandomSuffix: true`, (3) extracts text via the PDF utility, (4) generates embedding via `generateEmbedding`, (5) inserts into `documents` table with all fields including the vector, (6) writes audit log. Acceptance: uploading a real PDF creates a complete database row with a non-null `embedding` column.

33. **Build DocumentUploader component** — Create `src/components/documents/DocumentUploader.tsx` (`use client`). File input accepts `.pdf` only. Dropdown selects `ett` or `hardware`. Shows upload progress state, success confirmation, and error message. Disables inputs during submission. All form controls are labeled. Acceptance: drag-and-drop and click-to-select both trigger the file input; error shown if non-PDF selected.

34. **Build Documents list page** — Create `src/app/[lang]/documents/page.tsx` as RSC. Lists all team documents with filename, document type badge, upload timestamp, and an indexed indicator (whether `embedding IS NOT NULL`). Acceptance: page renders server-side with no client-only data fetching.

35. **Build Document detail page** — Create `src/app/[lang]/documents/[id]/page.tsx`. Show full metadata, a link to the original file in Vercel Blob, and a list of projects this document is attached to. Acceptance: all data server-rendered.

36. **Write delete document Server Action** — Extend `src/app/[lang]/documents/actions.ts` with `deleteDocument`. Remove the Supabase row (cascade handles `project_documents`). Acceptance: deleted document no longer appears in list and is removed from the embedding index.

---

## Phase 5 — Semantic Search (Days 7–8)

**Goal:** Users can enter a natural-language query and receive a ranked list of documents by cosine similarity, with percentage scores.

37. **Build semantic search library function** — Create `src/lib/search/semantic.ts`. The `semanticSearchDocuments` function accepts `query: string`, `teamId: string`, optional `documentType: 'ett' | 'hardware'`, and `limit: number` (default 10). Generates an embedding for the query, calls `supabase.rpc('search_documents_semantic', {...})`, maps results to a typed array including `similarity` as a 0–1 float. Returns an empty array (not a thrown error) if no results. Acceptance: querying "antenna RF specifications" against a seeded database returns documents with higher similarity scores than irrelevant queries.

38. **Build DocumentSelector component** — Create `src/components/analysis/DocumentSelector.tsx` (`use client`). Renders a textarea for the search query, a "Search Documents" button, a scrollable result list with checkboxes and similarity percentage badges, a selected-documents preview panel, and a "Run Analysis" button that enables only when at least one document is checked. All interactive elements have labels. Loading and error states are explicit. Acceptance: tab order is logical; screen reader announces result count via `aria-live`.

39. **Build document search page** — Create `src/app/[lang]/documents/search/page.tsx`. Mounts `DocumentSelector` in standalone mode (not project-scoped). Accepts an optional `?type=ett|hardware` URL param to pre-filter. Acceptance: direct-linking to `/en/documents/search?type=hardware` pre-selects the hardware filter.

40. **Write semantic search integration test** — Create `tests/integration/semantic-search.test.ts`. Seed two documents with known content, run a query that should match document A more than document B, assert the first result has a higher similarity score. Acceptance: test passes against a real Supabase test database.

---

## Phase 6 — Analysis Module and n8n Integration (Days 9–10)

**Goal:** The complete pipeline works end-to-end: user selects documents, triggers analysis, n8n annotates PDFs and returns a ZIP, the ZIP is downloadable from the project page.

41. **Build n8n webhook client** — Create `src/lib/n8n/client.ts` with the `triggerN8nWorkflow` function. Sends a `POST` with `Content-Type: application/json` to `process.env.N8N_WEBHOOK_URL`. Payload shape: `{ projectId, projectName, analysisId, selectedDocuments: [{id, filename, originalFileUrl, documentType}], webhookUrl }`. Sets a 30-second fetch timeout. Throws a typed `N8nTriggerError` if the response is not 2xx. Acceptance: a manual call with mock data reaches n8n and appears in its execution log.

42. **Write triggerAnalysis Server Action** — Create `src/app/[lang]/projects/[id]/analysis/actions.ts`. The action: (1) requires auth, (2) validates `selectedDocuments` is non-empty using `SelectedDocumentSchema` array, (3) verifies the requesting user's `team_id` matches the project's `team_id`, (4) inserts an `analysis_results` row with `status: 'processing'` and `selected_documents: selectedDocuments`, (5) links it to the project via `analysis_results_id`, (6) calls `triggerN8nWorkflow` — if n8n throws, immediately updates the record to `status: 'failed'` and re-throws, (7) writes audit log. Acceptance: triggering with two selected documents creates the correct DB record and an n8n execution is visible in the n8n dashboard.

43. **Build n8n webhook receiver** — Create `src/app/api/webhooks/n8n/route.ts`. The `POST` handler: validates that `analysisId` and `projectId` are present (returns 400 if not), on `status: 'completed'` updates `zip_file_url`, `analysis_metadata`, `status: 'completed'`, `completed_at`, on `status: 'failed'` updates `status: 'failed'`, `error_message`, calls `revalidateTag(`project-${projectId}`)` in all success paths, returns `{ success: true }`. Acceptance: a mock `curl` POST with the correct payload updates the DB row and a browser refresh shows the new state.

44. **Build n8n workflow** — In n8n, create a workflow with nodes: (1) Webhook listener, (2) Set Variables, (3) SplitInBatches loop over `selectedDocuments`, (4) HTTP Request node to download each PDF binary from Vercel Blob, (5) Code node (Python) running `annotate_pdf.py` — extracts text with `pdfplumber`, identifies sections matching a keyword list, writes highlight annotations, returns binary PDF, (6) HTTP Request to upload annotated PDF to Vercel Blob, (7) Code node (Python) to create a ZIP from all annotated PDFs plus a `manifest.json`, (8) HTTP Request to upload ZIP to Vercel Blob, (9) HTTP Request to send the completion webhook back to Next.js. Acceptance: running the workflow with two test PDFs produces a downloadable ZIP containing two annotated PDFs and a `manifest.json`.

45. **Write Python annotation script** — Create `scripts/annotate_pdf.py`. Takes PDF binary and a list of search terms. Uses `pdfplumber` to extract per-page text, identifies pages where any term appears, uses `PyPDF2` to write the output PDF (with a text annotation marking matching pages). Returns a dict with `pdf_binary`, `annotated_pages` list, and `total_matches`. Acceptance: given a PDF with the word "antenna" on page 3, the returned `annotated_pages` list includes `{"page": 3, "term": "antenna"}`.

46. **Build AnalysisResults component** — Create `src/components/analysis/AnalysisResults.tsx` (`use client`). Renders four states: `pending/processing` (spinner, pulsing dots, auto-refreshes every 5 seconds via `setTimeout` + `onRefresh` callback), `completed` (download link as `<a href={zipFileUrl} download>`, document count, completion timestamp), `failed` (error message), and `no data` (neutral placeholder). Acceptance: component transitions from processing to completed without a full page reload when the parent refreshes.

47. **Build project analysis page** — Create `src/app/[lang]/projects/[id]/analysis/page.tsx`. Fetches the project's current `analysis_results` (if any) server-side. Renders `DocumentSelector` and `AnalysisResults` side by side. Acceptance: a project with a completed analysis shows the download button immediately on page load without any client-side loading state.

---

## Phase 7 — Document-Project Linking (Days 11–12, part 1)

**Goal:** Users can attach any team document to a project and see those attachments on the project detail page.

48. **Write attachDocumentToProject Server Action** — Extend `src/app/[lang]/projects/[id]/actions.ts`. Insert into `project_documents`; use `ON CONFLICT DO NOTHING` to prevent duplicates. Write audit log. Acceptance: attaching the same document twice does not produce a duplicate row.

49. **Write detachDocumentFromProject Server Action** — Extend the same file. Delete from `project_documents` by `(project_id, document_id)` pair. Write audit log. Acceptance: detaching removes the row and the project detail page no longer lists the document.

50. **Build AttachDocumentsDialog component** — Create `src/components/projects/AttachDocumentsDialog.tsx`. Uses shadcn/ui `Dialog`. Lists all team documents not already attached. Checkbox multi-select. "Attach Selected" button calls the Server Action. Closes dialog on success. Focus returns to the trigger button on close (Radix handles this). Acceptance: adding three documents in one dialog interaction creates three `project_documents` rows.

51. **Update Project detail page** — Add "Attached Documents" section below the pipeline. List each attached document with its type, upload date, and a remove button. Add "Attach Documents" button that opens `AttachDocumentsDialog`. Acceptance: project detail page renders all attached documents server-side on initial load.

---

## Phase 8 — i18n, SEO, and Accessibility (Days 11–12, part 2)

**Goal:** All UI text is translatable, every page has correct metadata, and the app passes a WCAG 2.1 AA audit.

52. **Create translation message files** — Create `src/lib/i18n/messages/en.json` and `src/lib/i18n/messages/es.json` with keys for all visible UI strings including analysis keys from `corrected-implementation-guide.md` (`analysis.findRelatedDocuments`, `analysis.runAnalysis`, `analysis.downloadZip`, etc.). Acceptance: switching locale renders all labels in the correct language with no missing-key fallbacks.

53. **Build LanguageSwitcher component** — Create `src/components/common/LanguageSwitcher.tsx` (`use client`). Uses `useLocale` and `usePathname` from `next-intl`. Renders EN and ES links, marks the active locale with `aria-current="page"`. Acceptance: switching language on any page preserves the current route path.

54. **Implement per-route generateMetadata** — Add `generateMetadata` exports to `src/app/[lang]/layout.tsx`, `src/app/[lang]/projects/page.tsx`, `src/app/[lang]/documents/page.tsx`, and `src/app/[lang]/projects/[id]/analysis/page.tsx`. Each page must have a unique `title` (using the `%s | Platform` template), a `description`, and `alternates.languages` hreflang entries for `en` and `es`. Acceptance: `<head>` of each page contains the correct `<title>`, `<meta name="description">`, and `<link rel="alternate" hreflang>` tags.

55. **Build sitemap and robots** — Create `src/app/sitemap.ts` generating entries for all locale-prefixed static routes. Create `src/app/robots.ts` disallowing `/api/` and `/admin/`. Acceptance: `GET /sitemap.xml` returns a valid XML document; `GET /robots.txt` disallows API routes.

56. **Add JSON-LD schema** — Create `src/components/common/JsonLd.tsx` that renders a `<script type="application/ld+json">` tag. Add a `SoftwareApplication` schema to the root home page. Acceptance: Google's Rich Results Test validates the schema without errors.

57. **Build AccessibilitySkipLink component** — Create `src/components/common/AccessibilitySkipLink.tsx`. Renders an `<a href="#main-content">` that is visually hidden until focused, then slides into view. Wire it as the first child of `<body>` in `src/app/[lang]/layout.tsx`. The `<main>` element has `id="main-content"`. Acceptance: pressing Tab once on any page focuses the skip link; pressing Enter jumps focus past the navigation.

58. **Accessibility audit and remediation** — Run Lighthouse accessibility audit (target: 100). Run axe-core against key pages. Manually tab through the full app. Correct all violations: missing labels, insufficient contrast, skipped heading levels, missing alt text, missing ARIA roles. Acceptance: Lighthouse accessibility score is 95 or above on all four key pages.

---

## Phase 9 — Navigation, Layout, and Dashboard (Days 11–12, part 3)

**Goal:** A coherent shell with navigation, a meaningful dashboard, and global error and loading boundaries.

59. **Build Navigation component** — Create `src/components/layout/Navigation.tsx`. Renders links to Projects and Documents with active-state styling. Includes `LanguageSwitcher`. On mobile, collapses to a hamburger menu (shadcn/ui `Sheet`). Acceptance: all links are keyboard-navigable; active route has `aria-current="page"`.

60. **Build root locale layout** — Create `src/app/[lang]/layout.tsx`. Renders `AccessibilitySkipLink`, `Navigation`, `<main id="main-content">`, and `Footer`. Wraps children in `NextIntlClientProvider`. Acceptance: every page within the `[lang]` segment inherits this layout with no prop drilling.

61. **Build dashboard page** — Create `src/app/[lang]/page.tsx`. Server-side fetch: count of projects by stage, total document count, count of completed analyses. Render summary cards. Acceptance: dashboard shows real counts from the DB without client-side loading spinners.

62. **Add global error boundary** — Create `src/app/[lang]/error.tsx` (Next.js error boundary). Display a user-friendly error message with a "Try again" button. Acceptance: throwing in a page component triggers this boundary instead of a crash.

63. **Add loading skeletons** — Create `src/app/[lang]/projects/loading.tsx` and `src/app/[lang]/documents/loading.tsx`. Use shadcn/ui `Skeleton` components matching the card layout. Acceptance: navigating to these pages with artificial latency shows the skeleton before data loads.

---

## Phase 10 — Testing and Quality Gate (Days 13–14, part 1)

**Goal:** 80%+ unit test coverage on all components and server action logic; all critical E2E journeys pass in CI.

64. **Configure Vitest** — Install `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`. Create `vitest.config.ts`. Write a `npm run test` script. Acceptance: `npm run test` runs with no configuration errors.

65. **Configure Playwright** — Install `@playwright/test`, create `playwright.config.ts` targeting `localhost:3000`. Add a `npm run test:e2e` script. Acceptance: `npx playwright install` succeeds and a blank test passes.

66. **Unit test: ProjectForm** — Test that submitting with an empty name shows the name-required error; test that submitting with valid data calls the Server Action; test that the loading state disables the submit button. Acceptance: all three assertions pass.

67. **Unit test: DocumentUploader** — Test that selecting a non-PDF file shows a validation error; test that the document type dropdown defaults to `ett`; test that the submit button is disabled while uploading. Acceptance: all three assertions pass.

68. **Unit test: DocumentSelector** — Test that the "Run Analysis" button is disabled when no documents are selected; test that checking a result adds it to the selected list; test that clicking the remove button on a selected document removes it. Acceptance: all three assertions pass.

69. **Unit test: AnalysisResults** — Test the `processing` state renders a spinner; test the `completed` state renders a download link with the correct `href`; test the `failed` state renders the error message. Acceptance: all three assertions pass.

70. **E2E test: Full upload workflow** — Sign in, navigate to Documents, upload a sample ETT PDF, verify the document appears in the list with an "indexed" indicator. Acceptance: test passes against a Playwright test user and a real Supabase test database.

71. **E2E test: Full project workflow** — Create project "E2E Alpha", change stage to "docs_analysis", navigate to analysis page, run a semantic search query, select one result, click "Run Analysis", verify the analysis record shows `processing` status. Acceptance: test passes without timing out.

72. **E2E test: Language switching** — On the projects page in English, click the "Español" switcher, verify the URL changes to `/es/proyectos` and the page title is in Spanish. Acceptance: test passes.

---

## Phase 11 — Performance, Security, and Final Hardening (Days 13–14, part 2)

**Goal:** Core Web Vitals pass, no security vulnerabilities, no hardcoded secrets, app is production-ready.

73. **Performance audit** — Run `npm run build && npm run start`. Test with Lighthouse CLI or PageSpeed Insights. Targets: LCP < 2.5s, INP < 200ms, CLS < 0.1, Lighthouse performance score > 90. If LCP fails: verify `next/image` wraps all images, `next/font` is used for fonts, and Suspense boundaries prevent render-blocking. Acceptance: Lighthouse report screenshot shows all green.

74. **Security audit** — Run `npm audit` (zero high/critical). Scan all files for hardcoded secrets (`grep -r "sk-" src/`, `grep -r "eyJ" src/`). Verify RLS policies block cross-team reads using the anon key. Verify the n8n webhook receiver validates required fields before writing to the DB. Verify the document upload action rejects files over 50 MB. Acceptance: `npm audit` exits clean; no secrets in source; RLS test script confirms isolation.

75. **Add rate limiting to API routes** — Install `@upstash/ratelimit` or use middleware-level logic. Apply a rate limit of 30 requests/minute to `/api/webhooks/n8n` and `/api/search`. Acceptance: sending 31 rapid requests to either endpoint returns HTTP 429 on the 31st request.

76. **Add health check route** — Create `src/app/api/health/route.ts`. The `GET` handler pings Supabase with a simple query and returns `{ status: 'ok', db: true }` or `{ status: 'degraded', db: false }` with appropriate HTTP status codes. Acceptance: `GET /api/health` returns 200 with `{ status: 'ok' }` in a live environment.

77. **Configure Sentry error tracking** — Install `@sentry/nextjs`, run `npx @sentry/wizard@latest -i nextjs`. Set `SENTRY_DSN` in `.env.local` and Vercel dashboard. Acceptance: throwing a test error in production triggers a Sentry alert.

---

## Phase 12 — Production Deployment and Handoff (Day 14)

**Goal:** All code merged, production deployed, monitoring active, runbook documented.

78. **Merge all feature branches** — Open and merge PRs for all phases. Require at least one reviewer approval. Verify the Vercel preview deployment for each PR passed all CI checks before merging. Acceptance: `main` branch contains all feature code with no unresolved conflicts.

79. **Final production deployment** — Verify Vercel auto-deploys from `main`. Confirm all environment variables are set in the Vercel production environment. Run smoke tests against the production URL: sign in, upload one document, create one project, run one analysis. Acceptance: all five smoke tests pass on the live production URL.

80. **Enable Supabase point-in-time recovery** — In the Supabase dashboard, enable PITR (available on Pro tier) or verify daily backups are scheduled. Acceptance: backup policy is confirmed in the Supabase dashboard.

81. **Configure uptime monitoring** — Set up a Pingdom or BetterUptime check on `GET /api/health` every 5 minutes. Configure alerts to the team Slack channel. Acceptance: a manual 5-minute downtime simulation triggers a Slack alert.

82. **Write deployment runbook** — Document in `docs/DEPLOYMENT.md`: step-by-step deploy procedure, environment variable checklist, rollback procedure (revert Vercel deployment to previous build), incident escalation path. Acceptance: a team member unfamiliar with the codebase can follow the runbook to complete a deploy and a rollback.

83. **Update README** — Add setup instructions, stack overview, `npm run` command reference, link to `.env.example`, and architecture diagram reference. Acceptance: a new developer can go from `git clone` to `npm run dev` with a working local environment by following the README alone.

---

## Post-Launch Monitoring (Week 3–4)

84. **Monitor Sentry and Vercel Analytics** — Triage any errors that surface in the first 48 hours of production usage. Acceptance: no P0 (data-loss or auth-bypass) bugs remain unresolved after 48 hours.

85. **Conduct user testing session** — Run a structured session with the client: upload their real ETT, create a real project, trigger a real analysis, download the ZIP. Collect feedback. Log bugs and feature requests in the backlog. Acceptance: session notes documented and shared with the team.

86. **Publish case study** — Document the platform's time savings metric (target: from 15–20 hours of manual review to under 5 minutes of analysis time). Capture screenshots of the full workflow. Acceptance: case study published to the ibudi website or shared as a slide deck with the client.
