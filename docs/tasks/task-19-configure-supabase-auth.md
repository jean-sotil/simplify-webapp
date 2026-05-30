---
id: TASK-19
phase: "Phase 2 — Database Schema and Authentication (Day 2)"
title: "Configure Supabase Auth"
status: deferred
---

# TASK-19 — Configure Supabase Auth

## Phase
Phase 2 — Database Schema and Authentication (Day 2)

## Description
Enable Email provider with magic-link. Set redirect URLs for `localhost:3000` and the Vercel production domain.

## Acceptance Criteria
Sending a magic link to a test email address and clicking it creates a valid session.

## Manual Steps Required

This task requires manual configuration in the Supabase Dashboard. No CLI commands can perform these steps.

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/gtdxisxvkdwlflmtmpln) → **Authentication** → **Providers** → **Email**
2. Enable the **Email** provider
3. Enable **Magic Link** (disable password sign-in for this POC — uncheck "Enable email and password sign-ins")
4. Go to **Authentication** → **URL Configuration**
5. Add `http://localhost:3000/api/auth/callback` to **Allowed Redirect URLs**
6. Add `https://simplify-webapp-jean-paul-sotil-pastors-projects.vercel.app/api/auth/callback` to **Allowed Redirect URLs**
7. Save changes

Once these steps are completed, update this document's status to `completed`.
