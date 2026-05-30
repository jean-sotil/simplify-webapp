---
id: TASK-55
phase: "Phase 8 — i18n, SEO, and Accessibility (Days 11–12, part 2)"
title: "Build sitemap and robots"
status: pending
---

# TASK-55 — Build sitemap and robots

## Phase
Phase 8 — i18n, SEO, and Accessibility (Days 11–12, part 2)

## Description
Create `src/app/sitemap.ts` generating entries for all locale-prefixed static routes. Create `src/app/robots.ts` disallowing `/api/` and `/admin/`.

## Acceptance Criteria
`GET /sitemap.xml` returns a valid XML document; `GET /robots.txt` disallows API routes.
