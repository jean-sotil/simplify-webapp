---
id: TASK-75
phase: "Phase 11 — Performance, Security, and Final Hardening (Days 13–14, part 2)"
title: "Add rate limiting to API routes"
status: pending
---

# TASK-75 — Add rate limiting to API routes

## Phase
Phase 11 — Performance, Security, and Final Hardening (Days 13–14, part 2)

## Description
Install `@upstash/ratelimit` or use middleware-level logic. Apply a rate limit of 30 requests/minute to `/api/webhooks/n8n` and `/api/search`.

## Acceptance Criteria
Sending 31 rapid requests to either endpoint returns HTTP 429 on the 31st request.
