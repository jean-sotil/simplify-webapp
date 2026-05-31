---
id: TASK-31
phase: "Phase 4 — Documents Module (Days 5–6)"
title: "Build PDF text extraction utility"
status: completed
---

# TASK-31 — Build PDF text extraction utility

## Phase
Phase 4 — Documents Module (Days 5–6)

## Description
Create `src/lib/utils/pdf.ts` using `pdfjs-dist`. Extract text page-by-page, prepend each page with a `--- Page N ---` marker, concatenate. Handle corrupted or empty PDFs by throwing a typed error (not swallowing silently).

## Acceptance Criteria
Test with a 5-page PDF returns a non-empty string with page markers.
