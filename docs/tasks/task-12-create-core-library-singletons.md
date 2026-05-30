---
id: TASK-12
phase: "Phase 1 — Next.js Scaffold (Day 1)"
title: "Create core library singletons"
status: done
---

# TASK-12 — Create core library singletons

## Phase
Phase 1 — Next.js Scaffold (Day 1)

## Description
Write `src/lib/db.ts` (Supabase client + admin client with startup env validation), `src/lib/auth.ts` (`getSession`, `getUser`), `src/lib/ai/openai.ts` (`generateEmbedding`, `generateEmbeddingsBatch`).

## Acceptance Criteria
Importing each file does not throw at module load time.
