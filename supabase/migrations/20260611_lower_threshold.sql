-- Lower the default similarity threshold from 0.55 to 0.30
-- ETT requirements are in Spanish, hardware docs are in English — cross-language similarity is lower

CREATE OR REPLACE FUNCTION search_chunks_by_embedding_grouped(
  query_embedding       VECTOR(1536),
  doc_ids               UUID[],
  match_count           INT   DEFAULT 3,
  similarity_threshold  FLOAT DEFAULT 0.30
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
