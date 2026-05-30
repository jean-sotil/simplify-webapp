---
id: TASK-17
phase: "Phase 2 — Database Schema and Authentication (Day 2)"
title: "Enable Row-Level Security policies"
status: completed
---

# TASK-17 — Enable Row-Level Security policies

## Phase
Phase 2 — Database Schema and Authentication (Day 2)

## Description
Enable RLS on all six tables and write policies: projects and documents are scoped to `team_id` of the authenticated user; analysis_results are scoped to project ownership; audit_logs are scoped to the creating user.

## Acceptance Criteria
A request using the anon key cannot read another team's data.
