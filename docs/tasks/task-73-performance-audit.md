---
id: TASK-73
phase: "Phase 11 — Performance, Security, and Final Hardening (Days 13–14, part 2)"
title: "Performance audit"
status: pending
---

# TASK-73 — Performance audit

## Phase
Phase 11 — Performance, Security, and Final Hardening (Days 13–14, part 2)

## Description
Run `npm run build && npm run start`. Test with Lighthouse CLI or PageSpeed Insights. Targets: LCP < 2.5s, INP < 200ms, CLS < 0.1, Lighthouse performance score > 90. If LCP fails: verify `next/image` wraps all images, `next/font` is used for fonts, and Suspense boundaries prevent render-blocking.

## Acceptance Criteria
Lighthouse report screenshot shows all green.
