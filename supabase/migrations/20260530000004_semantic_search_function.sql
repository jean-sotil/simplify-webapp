CREATE OR REPLACE FUNCTION search_documents_semantic(
  query_embedding VECTOR(1536),
  team_id_param UUID,
  doc_type_filter TEXT DEFAULT NULL,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  filename TEXT,
  document_type TEXT,
  similarity FLOAT,
  uploaded_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    d.id,
    d.filename,
    d.document_type,
    1 - (d.embedding <=> query_embedding) AS similarity,
    d.uploaded_at
  FROM documents d
  WHERE d.team_id = team_id_param
    AND (doc_type_filter IS NULL OR d.document_type = doc_type_filter)
    AND d.embedding IS NOT NULL
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;
