---
id: TASK-74
phase: "Phase 11 — Performance, Security, and Final Hardening (Days 13–14, part 2)"
title: "Security audit"
status: pending
---

# TASK-74 — Security audit

## Phase
Phase 11 — Performance, Security, and Final Hardening (Days 13–14, part 2)

## Description
Run `npm audit` (zero high/critical). Scan all files for hardcoded secrets (`grep -r "sk-" src/`, `grep -r "eyJ" src/`). Verify RLS policies block cross-team reads using the anon key. Verify the n8n webhook receiver validates required fields before writing to the DB. Verify the document upload action rejects files over 50 MB.

## Acceptance Criteria
`npm audit` exits clean; no secrets in source; RLS test script confirms isolation.
