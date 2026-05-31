-- =============================================================================
-- Simplify — Full Database Setup
-- Run this in Supabase Dashboard → SQL Editor, or via:
--   supabase db push
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS
-- =============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID REFERENCES teams(id) ON DELETE CASCADE,          -- nullable for POC
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  stage       TEXT NOT NULL DEFAULT 'initiation'
              CHECK (stage IN ('initiation','planning','docs_analysis',
                               'development','deployment','completed')),
  owner_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           UUID REFERENCES teams(id) ON DELETE CASCADE,    -- nullable for POC
  filename          TEXT NOT NULL,
  document_type     TEXT NOT NULL CHECK (document_type IN ('ett','hardware')),
  original_file_url TEXT NOT NULL,
  extracted_text    TEXT DEFAULT '',
  embedding         VECTOR(1536),
  metadata          JSONB DEFAULT '{}',
  uploaded_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_documents (
  project_id  UUID NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  attached_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, document_id)
);

CREATE TABLE IF NOT EXISTS analysis_results (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  selected_documents JSONB NOT NULL DEFAULT '[]',
  zip_file_url       TEXT,
  analysis_metadata  JSONB,
  triggered_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at       TIMESTAMPTZ,
  status             TEXT DEFAULT 'pending'
                     CHECK (status IN ('pending','processing','completed','failed')),
  error_message      TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id       UUID REFERENCES teams(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   UUID,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_projects_owner      ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_id    ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_stage      ON projects(stage);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded  ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_team_id   ON documents(team_id);
CREATE INDEX IF NOT EXISTS idx_documents_type      ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_analysis_project    ON analysis_results(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id       ON audit_logs(user_id);

-- ─── Row-Level Security ───────────────────────────────────────────────────────
-- Scoped by owner_id / uploaded_by (no team_id JWT claim required for POC)

ALTER TABLE teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;

-- Drop any previously created policies so this script is idempotent
DO $$ BEGIN
  -- projects
  DROP POLICY IF EXISTS "projects_select"  ON projects;
  DROP POLICY IF EXISTS "projects_insert"  ON projects;
  DROP POLICY IF EXISTS "projects_update"  ON projects;
  DROP POLICY IF EXISTS "projects_delete"  ON projects;
  DROP POLICY IF EXISTS "projects_all"     ON projects;
  -- documents
  DROP POLICY IF EXISTS "documents_select" ON documents;
  DROP POLICY IF EXISTS "documents_insert" ON documents;
  DROP POLICY IF EXISTS "documents_update" ON documents;
  DROP POLICY IF EXISTS "documents_delete" ON documents;
  DROP POLICY IF EXISTS "documents_all"    ON documents;
  -- project_documents
  DROP POLICY IF EXISTS "project_documents_select" ON project_documents;
  DROP POLICY IF EXISTS "project_documents_insert" ON project_documents;
  DROP POLICY IF EXISTS "project_documents_delete" ON project_documents;
  DROP POLICY IF EXISTS "project_documents_all"    ON project_documents;
  -- analysis_results
  DROP POLICY IF EXISTS "analysis_results_select"  ON analysis_results;
  DROP POLICY IF EXISTS "analysis_results_insert"  ON analysis_results;
  DROP POLICY IF EXISTS "analysis_results_update"  ON analysis_results;
  DROP POLICY IF EXISTS "analysis_results_all"     ON analysis_results;
  -- audit_logs
  DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
  DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
  -- teams
  DROP POLICY IF EXISTS "teams_select" ON teams;
  DROP POLICY IF EXISTS "teams_all"    ON teams;
END $$;

-- projects: owner_id = current user
CREATE POLICY "projects_all" ON projects FOR ALL
  USING     (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- documents: uploaded_by = current user
CREATE POLICY "documents_all" ON documents FOR ALL
  USING     (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- project_documents: via project ownership
CREATE POLICY "project_documents_all" ON project_documents FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- analysis_results: via project ownership
CREATE POLICY "analysis_results_all" ON analysis_results FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- audit_logs: own entries only (service-role writes bypass RLS)
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- teams: open read for now (no team provisioning in POC)
CREATE POLICY "teams_all" ON teams FOR ALL
  USING (true)
  WITH CHECK (true);

-- ─── Semantic Search Function ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION search_documents_semantic(
  query_embedding  VECTOR(1536),
  team_id_param    UUID,
  doc_type_filter  TEXT DEFAULT NULL,
  match_count      INT  DEFAULT 10
)
RETURNS TABLE (
  id            UUID,
  filename      TEXT,
  document_type TEXT,
  similarity    FLOAT,
  uploaded_at   TIMESTAMPTZ
)
LANGUAGE SQL STABLE AS $$
  SELECT
    d.id,
    d.filename,
    d.document_type,
    1 - (d.embedding <=> query_embedding) AS similarity,
    d.uploaded_at
  FROM documents d
  WHERE d.uploaded_by = auth.uid()
    AND (doc_type_filter IS NULL OR d.document_type = doc_type_filter)
    AND d.embedding IS NOT NULL
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;
