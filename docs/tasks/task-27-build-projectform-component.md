---
id: TASK-27
phase: "Phase 3 — Projects Module (Days 3–4)"
title: "Build ProjectForm component"
status: completed
---

# TASK-27 — Build ProjectForm component

## Phase
Phase 3 — Projects Module (Days 3–4)

## Description
Create `src/components/projects/ProjectForm.tsx` (`use client`). Handles both create and edit modes. Uses `useFormStatus` for pending state. Validates on client before submission. Every input has an associated `<label>` and `aria-describedby` pointing to its error element.

## Acceptance Criteria
Submitting an empty name shows an inline error; submitting valid data calls the Server Action.
