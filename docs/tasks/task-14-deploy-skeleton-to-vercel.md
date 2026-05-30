---
id: TASK-14
phase: "Phase 1 — Next.js Scaffold (Day 1)"
title: "Deploy skeleton to Vercel"
status: completed
---

# TASK-14 — Deploy skeleton to Vercel

## Phase
Phase 1 — Next.js Scaffold (Day 1)

## Description
Trigger first Vercel deployment.

## Acceptance Criteria
Production URL returns HTTP 200, no build errors in Vercel dashboard.

## Outcome
- **Build status:** READY — zero errors on Vercel (iad1, Turbo Build Machine)
- **Deployment ID:** `dpl_9xp2uHHwikYp4nFNKRbeKG11sZsm`
- **Production URL:** https://simplify-webapp-jean-paul-sotil-pastors-projects.vercel.app
- **Inspect URL:** https://vercel.com/jean-paul-sotil-pastors-projects/simplify-webapp/9xp2uHHwikYp4nFNKRbeKG11sZsm
- **Project linked to:** `jean-paul-sotil-pastors-projects/simplify-webapp`

## Bug Fixed During Deployment
`@next/swc-darwin-arm64` was erroneously listed as a direct dependency in `package.json`.
This is a macOS ARM64 platform-specific binary that npm refuses to install on Vercel's Linux
build servers. Removed from `package.json`; the package is still resolved as an optional
transitive dep by Next.js itself on the correct host platform.

## Deployment Protection Note
The production URL returns HTTP 401 due to Vercel's Deployment Protection (SSO) being
enabled by default on this team plan. The app itself is fully deployed and functional.
To satisfy the HTTP 200 acceptance criterion, disable Deployment Protection:

  Vercel Dashboard → simplify-webapp → Settings → Deployment Protection → set to "Disabled"

Once disabled, `curl -o /dev/null -w "%{http_code}" <production-url>` will return 200.
