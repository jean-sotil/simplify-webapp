-- =============================================================================
-- User Roles table + RLS updates for admin access
-- =============================================================================

-- ─── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_roles (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Admins can read all roles, users can only read their own
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
CREATE POLICY "user_roles_select" ON user_roles FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Only admins can update roles
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
CREATE POLICY "user_roles_update" ON user_roles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Only admins can insert roles (or service_role for bootstrap)
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
CREATE POLICY "user_roles_insert" ON user_roles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── Auto-assign 'user' role on signup ───────────────────────────────────────

CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION assign_default_role();

-- ─── Update RLS policies for admin access ────────────────────────────────────

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Projects: owner OR admin
DROP POLICY IF EXISTS "projects_all" ON projects;
CREATE POLICY "projects_all" ON projects FOR ALL
  USING (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

-- Documents: uploaded_by OR admin
DROP POLICY IF EXISTS "documents_all" ON documents;
CREATE POLICY "documents_all" ON documents FOR ALL
  USING (uploaded_by = auth.uid() OR is_admin())
  WITH CHECK (uploaded_by = auth.uid() OR is_admin());

-- Document chunks: via document ownership OR admin
DROP POLICY IF EXISTS "document_chunks_all" ON document_chunks;
CREATE POLICY "document_chunks_all" ON document_chunks FOR ALL
  USING (
    document_id IN (SELECT id FROM documents WHERE uploaded_by = auth.uid())
    OR is_admin()
  );

-- Project documents: via project ownership OR admin
DROP POLICY IF EXISTS "project_documents_all" ON project_documents;
CREATE POLICY "project_documents_all" ON project_documents FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    OR is_admin()
  );

-- Analysis results: via project ownership OR admin
DROP POLICY IF EXISTS "analysis_results_all" ON analysis_results;
CREATE POLICY "analysis_results_all" ON analysis_results FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    OR is_admin()
  );

-- ─── Assign roles to existing users ─────────────────────────────────────────

INSERT INTO user_roles (user_id, role)
SELECT id, 'user' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
