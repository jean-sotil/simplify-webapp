---
id: TASK-37
phase: "Phase 5 — Semantic Search (Days 7–8)"
title: "Build semantic search library function"
status: pending
---

# TASK-37 — Build semantic search library function

## Phase
Phase 5 — Semantic Search (Days 7–8)

## Description
Create `src/lib/search/semantic.ts`. The `semanticSearchDocuments` function accepts `query: string`, `teamId: string`, optional `documentType: 'ett' | 'hardware'`, and `limit: number` (default 10). Generates an embedding for the query, calls `supabase.rpc('search_documents_semantic', {...})`, maps results to a typed array including `similarity` as a 0–1 float. Returns an empty array (not a thrown error) if no results.

## Acceptance Criteria
Querying "antenna RF specifications" against a seeded database returns documents with higher similarity scores than irrelevant queries.
