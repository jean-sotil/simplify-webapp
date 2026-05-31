---
id: TASK-39
phase: "Phase 5 — Semantic Search (Days 7–8)"
title: "Build document search page"
status: completed
---

# TASK-39 — Build document search page

## Phase
Phase 5 — Semantic Search (Days 7–8)

## Description
Create `src/app/[lang]/documents/search/page.tsx`. Mounts `DocumentSelector` in standalone mode (not project-scoped). Accepts an optional `?type=ett|hardware` URL param to pre-filter.

## Acceptance Criteria
Direct-linking to `/en/documents/search?type=hardware` pre-selects the hardware filter.
