---
id: TASK-50
phase: "Phase 7 — Document-Project Linking (Days 11–12, part 1)"
title: "Build AttachDocumentsDialog component"
status: pending
---

# TASK-50 — Build AttachDocumentsDialog component

## Phase
Phase 7 — Document-Project Linking (Days 11–12, part 1)

## Description
Create `src/components/projects/AttachDocumentsDialog.tsx`. Uses shadcn/ui `Dialog`. Lists all team documents not already attached. Checkbox multi-select. "Attach Selected" button calls the Server Action. Closes dialog on success. Focus returns to the trigger button on close (Radix handles this).

## Acceptance Criteria
Adding three documents in one dialog interaction creates three `project_documents` rows.
