---
id: TASK-24
phase: "Phase 3 — Projects Module (Days 3–4)"
title: "Write Projects Server Actions"
status: pending
---

# TASK-24 — Write Projects Server Actions

## Phase
Phase 3 — Projects Module (Days 3–4)

## Description
Create `src/app/[lang]/projects/actions.ts` with four actions: `createProject` (validates with `CreateProjectSchema`, inserts, revalidates, writes audit log), `updateProject` (validates with `UpdateProjectSchema`, updates, revalidates, writes audit log), `updateProjectStage` (validates the stage enum, updates, writes audit log), `deleteProject` (cascades, writes audit log). All actions call `requireAuth()` first.

## Acceptance Criteria
Each action tested manually produces the correct database row and audit log entry.
