---
id: TASK-32
phase: "Phase 4 — Documents Module (Days 5–6)"
title: "Write Document upload Server Action"
status: completed
---

# TASK-32 — Write Document upload Server Action

## Phase
Phase 4 — Documents Module (Days 5–6)

## Description
Create `src/app/[lang]/documents/actions.ts`. The `uploadDocument` action: (1) validates file with `DocumentUploadSchema`, (2) streams to Vercel Blob with `access: 'private'` and `addRandomSuffix: true`, (3) extracts text via the PDF utility, (4) generates embedding via `generateEmbedding`, (5) inserts into `documents` table with all fields including the vector, (6) writes audit log.

## Acceptance Criteria
Uploading a real PDF creates a complete database row with a non-null `embedding` column.
