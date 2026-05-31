---
id: TASK-36
phase: "Phase 4 — Documents Module (Days 5–6)"
title: "Write delete document Server Action"
status: completed
---

# TASK-36 — Write delete document Server Action

## Phase
Phase 4 — Documents Module (Days 5–6)

## Description
Extend `src/app/[lang]/documents/actions.ts` with `deleteDocument`. Remove the Supabase row (cascade handles `project_documents`).

## Acceptance Criteria
Deleted document no longer appears in list and is removed from the embedding index.
