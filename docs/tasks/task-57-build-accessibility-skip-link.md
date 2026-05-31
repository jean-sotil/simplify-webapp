---
id: TASK-57
phase: "Phase 8 — i18n, SEO, and Accessibility (Days 11–12, part 2)"
title: "Build AccessibilitySkipLink component"
status: completed
---

# TASK-57 — Build AccessibilitySkipLink component

## Phase
Phase 8 — i18n, SEO, and Accessibility (Days 11–12, part 2)

## Description
Create `src/components/common/AccessibilitySkipLink.tsx`. Renders an `<a href="#main-content">` that is visually hidden until focused, then slides into view. Wire it as the first child of `<body>` in `src/app/[lang]/layout.tsx`. The `<main>` element has `id="main-content"`.

## Acceptance Criteria
Pressing Tab once on any page focuses the skip link; pressing Enter jumps focus past the navigation.
