---
id: TASK-53
phase: "Phase 8 — i18n, SEO, and Accessibility (Days 11–12, part 2)"
title: "Build LanguageSwitcher component"
status: pending
---

# TASK-53 — Build LanguageSwitcher component

## Phase
Phase 8 — i18n, SEO, and Accessibility (Days 11–12, part 2)

## Description
Create `src/components/common/LanguageSwitcher.tsx` (`use client`). Uses `useLocale` and `usePathname` from `next-intl`. Renders EN and ES links, marks the active locale with `aria-current="page"`.

## Acceptance Criteria
Switching language on any page preserves the current route path.
