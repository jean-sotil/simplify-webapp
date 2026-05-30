---
id: TASK-49
phase: "Phase 7 — Document-Project Linking (Days 11–12, part 1)"
title: "Write detachDocumentFromProject Server Action"
status: pending
---

# TASK-49 — Write detachDocumentFromProject Server Action

## Phase
Phase 7 — Document-Project Linking (Days 11–12, part 1)

## Description
Extend the same file. Delete from `project_documents` by `(project_id, document_id)` pair. Write audit log.

## Acceptance Criteria
Detaching removes the row and the project detail page no longer lists the document.
