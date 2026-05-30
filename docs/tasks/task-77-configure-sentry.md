---
id: TASK-77
phase: "Phase 11 — Performance, Security, and Final Hardening (Days 13–14, part 2)"
title: "Configure Sentry error tracking"
status: pending
---

# TASK-77 — Configure Sentry error tracking

## Phase
Phase 11 — Performance, Security, and Final Hardening (Days 13–14, part 2)

## Description
Install `@sentry/nextjs`, run `npx @sentry/wizard@latest -i nextjs`. Set `SENTRY_DSN` in `.env.local` and Vercel dashboard.

## Acceptance Criteria
Throwing a test error in production triggers a Sentry alert.
