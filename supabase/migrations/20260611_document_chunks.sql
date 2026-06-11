-- =============================================================================
-- Migration: document_chunks table + chunked semantic search function
-- Enables per-page/section embeddings for better similarity matching
-- =============================================================================

-- ─── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index  INT NOT NULL,
  page_number  INT,                          -- nullable (some PDFs don't have clear pages)
  chunk_text   TEXT NOT NULL,
  embedding    VECTOR(1536),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, chunk_index)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_id
  ON document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_chunks_all" ON document_chunks;

CREATE POLICY "document_chunks_all" ON document_chunks FOR ALL
  USING (
    document_id IN (SELECT id FROM documents WHERE uploaded_by = auth.uid())
  );

-- ─── Chunked Semantic Search Function ────────────────────────────────────────
-- Searches chunks belonging to the specified document IDs.
-- Returns document_id, page_number, chunk_text snippet, and similarity.
-- Groups by document_id to return the best-matching chunk per document.

CREATE OR REPLACE FUNCTION search_chunks_by_embedding(
  query_embedding       VECTOR(1536),
  doc_ids               UUID[],
  match_count           INT   DEFAULT 3,
  similarity_threshold  FLOAT DEFAULT 0.55
)
RETURNS TABLE (
  chunk_id      UUID,
  document_id   UUID,
  page_number   INT,
  chunk_text    TEXT,
  similarity    FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    c.id AS chunk_id,
    c.document_id,
    c.page_number,
    c.chunk_text,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM document_chunks c
  WHERE c.document_id = ANY(doc_ids)
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ─── Aggregated search: best chunk per document ──────────────────────────────
-- Returns one row per document (the highest-similarity chunk),
-- plus the document's filename and type from the documents table.

CREATE OR REPLACE FUNCTION search_chunks_by_embedding_grouped(
  query_embedding       VECTOR(1536),
  doc_ids               UUID[],
  match_count           INT   DEFAULT 3,
  similarity_threshold  FLOAT DEFAULT 0.55
)
RETURNS TABLE (
  document_id    UUID,
  filename       TEXT,
  document_type  TEXT,
  page_number    INT,
  chunk_text     TEXT,
  similarity     FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT DISTINCT ON (c.document_id)
    c.document_id,
    d.filename,
    d.document_type,
    c.page_number,
    c.chunk_text,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM document_chunks c
  JOIN documents d ON d.id = c.document_id
  WHERE c.document_id = ANY(doc_ids)
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY c.document_id, c.embedding <=> query_embedding
  LIMIT match_count;
$$;
