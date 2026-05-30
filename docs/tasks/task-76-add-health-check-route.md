---
id: TASK-76
phase: "Phase 11 — Performance, Security, and Final Hardening (Days 13–14, part 2)"
title: "Add health check route"
status: pending
---

# TASK-76 — Add health check route

## Phase
Phase 11 — Performance, Security, and Final Hardening (Days 13–14, part 2)

## Description
Create `src/app/api/health/route.ts`. The `GET` handler pings Supabase with a simple query and returns `{ status: 'ok', db: true }` or `{ status: 'degraded', db: false }` with appropriate HTTP status codes.

## Acceptance Criteria
`GET /api/health` returns 200 with `{ status: 'ok' }` in a live environment.
