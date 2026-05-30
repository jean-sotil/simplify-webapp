---
id: TASK-43
phase: "Phase 6 — Analysis Module and n8n Integration (Days 9–10)"
title: "Build n8n webhook receiver"
status: pending
---

# TASK-43 — Build n8n webhook receiver

## Phase
Phase 6 — Analysis Module and n8n Integration (Days 9–10)

## Description
Create `src/app/api/webhooks/n8n/route.ts`. The `POST` handler: validates that `analysisId` and `projectId` are present (returns 400 if not), on `status: 'completed'` updates `zip_file_url`, `analysis_metadata`, `status: 'completed'`, `completed_at`, on `status: 'failed'` updates `status: 'failed'`, `error_message`, calls `revalidateTag(`project-${projectId}`)` in all success paths, returns `{ success: true }`.

## Acceptance Criteria
A mock `curl` POST with the correct payload updates the DB row and a browser refresh shows the new state.
