---
id: TASK-05
phase: "Phase 0 — Pre-Sprint Infrastructure"
title: "Enable Vercel Blob storage"
status: pending
---

# TASK-05 — Enable Vercel Blob storage

## Phase
Phase 0 — Pre-Sprint Infrastructure

## Description
Link the GitHub repo to Vercel, enable Blob on the project, generate `BLOB_READ_WRITE_TOKEN`.

## Steps

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) and open (or create) the `simplify-webapp` project.
2. In the left sidebar, click **Storage**.
3. Click **Create Database** and select **Blob**.
4. Click **Continue**.
5. Set access to **Private** (recommended for upload tokens).
6. Enter a store name (e.g. `simplify-blob`) and click **Create a new Blob store**.
7. Select the environments where the token should be injected (`Production`, `Preview`, `Development`) and confirm.
8. Vercel automatically adds `BLOB_READ_WRITE_TOKEN` to your project's environment variables.
9. Copy the token value and paste it into your local `.env.local` file as `BLOB_READ_WRITE_TOKEN=<value>`.

## Acceptance Criteria
A programmatic `put()` call succeeds and returns a CDN URL.
