---
id: TASK-18
phase: "Phase 2 — Database Schema and Authentication (Day 2)"
title: "Deploy search_documents_semantic SQL function"
status: completed
---

# TASK-18 — Deploy search_documents_semantic SQL function

## Phase
Phase 2 — Database Schema and Authentication (Day 2)

## Description
Create the `RETURNS TABLE` function that accepts `query_embedding VECTOR(1536)`, `team_id_param UUID`, optional `doc_type_filter TEXT`, and `match_count INT`. Returns `id`, `filename`, `document_type`, `similarity` (cosine), and `uploaded_at`.

## Acceptance Criteria
Calling `supabase.rpc('search_documents_semantic', {...})` with a test vector returns rows ordered by descending similarity.
