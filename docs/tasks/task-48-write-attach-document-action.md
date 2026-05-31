---
id: TASK-48
phase: "Phase 7 — Document-Project Linking (Days 11–12, part 1)"
title: "Write attachDocumentToProject Server Action"
status: completed
---

# TASK-48 — Write attachDocumentToProject Server Action

## Phase
Phase 7 — Document-Project Linking (Days 11–12, part 1)

## Description
Extend `src/app/[lang]/projects/[id]/actions.ts`. Insert into `project_documents`; use `ON CONFLICT DO NOTHING` to prevent duplicates. Write audit log.

## Acceptance Criteria
Attaching the same document twice does not produce a duplicate row.
