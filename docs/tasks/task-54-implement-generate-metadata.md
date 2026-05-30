---
id: TASK-54
phase: "Phase 8 — i18n, SEO, and Accessibility (Days 11–12, part 2)"
title: "Implement per-route generateMetadata"
status: pending
---

# TASK-54 — Implement per-route generateMetadata

## Phase
Phase 8 — i18n, SEO, and Accessibility (Days 11–12, part 2)

## Description
Add `generateMetadata` exports to `src/app/[lang]/layout.tsx`, `src/app/[lang]/projects/page.tsx`, `src/app/[lang]/documents/page.tsx`, and `src/app/[lang]/projects/[id]/analysis/page.tsx`. Each page must have a unique `title` (using the `%s | Platform` template), a `description`, and `alternates.languages` hreflang entries for `en` and `es`.

## Acceptance Criteria
`<head>` of each page contains the correct `<title>`, `<meta name="description">`, and `<link rel="alternate" hreflang>` tags.
