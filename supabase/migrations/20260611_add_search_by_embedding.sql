-- Search documents by embedding vector with document ID filter
-- Used by buildRequirementTraceMap to find hardware docs matching each requirement
CREATE OR REPLACE FUNCTION search_documents_by_embedding(
  query_embedding  VECTOR(1536),
  doc_ids          UUID[],
  match_count      INT  DEFAULT 3,
  similarity_threshold FLOAT DEFAULT 0.60
)
RETURNS TABLE (
  id            UUID,
  filename      TEXT,
  document_type TEXT,
  similarity    FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    d.id,
    d.filename,
    d.document_type,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE d.id = ANY(doc_ids)
    AND d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;
