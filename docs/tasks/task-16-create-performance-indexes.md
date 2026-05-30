---
id: TASK-16
phase: "Phase 2 — Database Schema and Authentication (Day 2)"
title: "Create performance indexes"
status: completed
---

# TASK-16 — Create performance indexes

## Phase
Phase 2 — Database Schema and Authentication (Day 2)

## Description
Execute all `CREATE INDEX` statements: `idx_projects_team_id`, `idx_projects_stage`, `idx_documents_team_id`, `idx_documents_type`, `idx_documents_embedding` (using `ivfflat` with `vector_cosine_ops`, `lists = 100`), `idx_analysis_project_id`, `idx_audit_user_id`.

## Acceptance Criteria
`EXPLAIN ANALYZE` on a join query shows index scans, not sequential scans.
