---
id: TASK-22
phase: "Phase 2 — Database Schema and Authentication (Day 2)"
title: "Configure i18n middleware"
status: completed
---

# TASK-22 — Configure i18n middleware

## Phase
Phase 2 — Database Schema and Authentication (Day 2)

## Description
Create `src/lib/i18n/routing.ts` using `next-intl/routing` with locales `['en', 'es']`, default `'en'`, and path aliases (`/projects` → `/proyectos` for `es`). Wire `next-intl/middleware` into `src/middleware.ts`.

## Acceptance Criteria
Navigating to `/` redirects to `/en/`, and `/es/projects` renders without a 404.
