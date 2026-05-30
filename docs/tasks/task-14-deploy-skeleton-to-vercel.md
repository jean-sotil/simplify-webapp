---
id: TASK-14
phase: "Phase 1 — Next.js Scaffold (Day 1)"
title: "Deploy skeleton to Vercel"
status: deferred
---

# TASK-14 — Deploy skeleton to Vercel

## Phase
Phase 1 — Next.js Scaffold (Day 1)

## Description
Trigger first Vercel deployment.

## Acceptance Criteria
Production URL returns HTTP 200, no build errors in Vercel dashboard.

## Notes
Deferred — Vercel CLI requires browser OAuth (`vercel login`) which must be completed manually.
To resume: run `! vercel login` then `/maestro:maestro work on task-14`.
Alternative: create a token at vercel.com/account/tokens and run `vercel --prod --token <token>`.
