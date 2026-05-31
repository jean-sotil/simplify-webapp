---
id: TASK-38
phase: "Phase 5 — Semantic Search (Days 7–8)"
title: "Build DocumentSelector component"
status: completed
---

# TASK-38 — Build DocumentSelector component

## Phase
Phase 5 — Semantic Search (Days 7–8)

## Description
Create `src/components/analysis/DocumentSelector.tsx` (`use client`). Renders a textarea for the search query, a "Search Documents" button, a scrollable result list with checkboxes and similarity percentage badges, a selected-documents preview panel, and a "Run Analysis" button that enables only when at least one document is checked. All interactive elements have labels. Loading and error states are explicit.

## Acceptance Criteria
Tab order is logical; screen reader announces result count via `aria-live`.
