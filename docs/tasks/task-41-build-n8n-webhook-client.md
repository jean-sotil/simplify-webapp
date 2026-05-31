---
id: TASK-41
phase: "Phase 6 — Analysis Module and n8n Integration (Days 9–10)"
title: "Build n8n webhook client"
status: completed
---

# TASK-41 — Build n8n webhook client

## Phase
Phase 6 — Analysis Module and n8n Integration (Days 9–10)

## Description
Create `src/lib/n8n/client.ts` with the `triggerN8nWorkflow` function. Sends a `POST` with `Content-Type: application/json` to `process.env.N8N_WEBHOOK_URL`. Payload shape: `{ projectId, projectName, analysisId, selectedDocuments: [{id, filename, originalFileUrl, documentType}], webhookUrl }`. Sets a 30-second fetch timeout. Throws a typed `N8nTriggerError` if the response is not 2xx.

## Acceptance Criteria
A manual call with mock data reaches n8n and appears in its execution log.
