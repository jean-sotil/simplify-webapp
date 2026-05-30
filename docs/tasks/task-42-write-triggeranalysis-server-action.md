---
id: TASK-42
phase: "Phase 6 — Analysis Module and n8n Integration (Days 9–10)"
title: "Write triggerAnalysis Server Action"
status: pending
---

# TASK-42 — Write triggerAnalysis Server Action

## Phase
Phase 6 — Analysis Module and n8n Integration (Days 9–10)

## Description
Create `src/app/[lang]/projects/[id]/analysis/actions.ts`. The action: (1) requires auth, (2) validates `selectedDocuments` is non-empty using `SelectedDocumentSchema` array, (3) verifies the requesting user's `team_id` matches the project's `team_id`, (4) inserts an `analysis_results` row with `status: 'processing'` and `selected_documents: selectedDocuments`, (5) links it to the project via `analysis_results_id`, (6) calls `triggerN8nWorkflow` — if n8n throws, immediately updates the record to `status: 'failed'` and re-throws, (7) writes audit log.

## Acceptance Criteria
Triggering with two selected documents creates the correct DB record and an n8n execution is visible in the n8n dashboard.
