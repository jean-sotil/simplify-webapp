---
id: TASK-46
phase: "Phase 6 — Analysis Module and n8n Integration (Days 9–10)"
title: "Build AnalysisResults component"
status: completed
---

# TASK-46 — Build AnalysisResults component

## Phase
Phase 6 — Analysis Module and n8n Integration (Days 9–10)

## Description
Create `src/components/analysis/AnalysisResults.tsx` (`use client`). Renders four states: `pending/processing` (spinner, pulsing dots, auto-refreshes every 5 seconds via `setTimeout` + `onRefresh` callback), `completed` (download link as `<a href={zipFileUrl} download>`, document count, completion timestamp), `failed` (error message), and `no data` (neutral placeholder).

## Acceptance Criteria
Component transitions from processing to completed without a full page reload when the parent refreshes.
