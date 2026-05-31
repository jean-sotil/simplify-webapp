---
id: TASK-60
phase: "Phase 9 — Navigation, Layout, and Dashboard (Days 11–12, part 3)"
title: "Build root locale layout"
status: completed
---

# TASK-60 — Build root locale layout

## Phase
Phase 9 — Navigation, Layout, and Dashboard (Days 11–12, part 3)

## Description
Create `src/app/[lang]/layout.tsx`. Renders `AccessibilitySkipLink`, `Navigation`, `<main id="main-content">`, and `Footer`. Wraps children in `NextIntlClientProvider`.

## Acceptance Criteria
Every page within the `[lang]` segment inherits this layout with no prop drilling.
