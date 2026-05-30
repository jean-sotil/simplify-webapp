-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: get the team_id for the authenticated user
-- Users are members of the team that matches their user metadata or a team_members table.
-- For this POC, we scope data by checking that the team_id matches the user's app_metadata team_id.

-- Teams: users can only see their own team
CREATE POLICY "teams_select" ON teams FOR SELECT
  USING (id = (auth.jwt()->>'team_id')::UUID);

-- Projects: scoped to team_id from JWT
CREATE POLICY "projects_select" ON projects FOR SELECT
  USING (team_id = (auth.jwt()->>'team_id')::UUID);
CREATE POLICY "projects_insert" ON projects FOR INSERT
  WITH CHECK (team_id = (auth.jwt()->>'team_id')::UUID);
CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (team_id = (auth.jwt()->>'team_id')::UUID);
CREATE POLICY "projects_delete" ON projects FOR DELETE
  USING (team_id = (auth.jwt()->>'team_id')::UUID);

-- Documents: scoped to team_id from JWT
CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (team_id = (auth.jwt()->>'team_id')::UUID);
CREATE POLICY "documents_insert" ON documents FOR INSERT
  WITH CHECK (team_id = (auth.jwt()->>'team_id')::UUID);
CREATE POLICY "documents_update" ON documents FOR UPDATE
  USING (team_id = (auth.jwt()->>'team_id')::UUID);
CREATE POLICY "documents_delete" ON documents FOR DELETE
  USING (team_id = (auth.jwt()->>'team_id')::UUID);

-- Project documents: users can manage attachments for their team's projects
CREATE POLICY "project_documents_select" ON project_documents FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE team_id = (auth.jwt()->>'team_id')::UUID)
  );
CREATE POLICY "project_documents_insert" ON project_documents FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE team_id = (auth.jwt()->>'team_id')::UUID)
  );
CREATE POLICY "project_documents_delete" ON project_documents FOR DELETE
  USING (
    project_id IN (SELECT id FROM projects WHERE team_id = (auth.jwt()->>'team_id')::UUID)
  );

-- Analysis results: scoped to project ownership
CREATE POLICY "analysis_results_select" ON analysis_results FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE team_id = (auth.jwt()->>'team_id')::UUID)
  );
CREATE POLICY "analysis_results_insert" ON analysis_results FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE team_id = (auth.jwt()->>'team_id')::UUID)
  );
CREATE POLICY "analysis_results_update" ON analysis_results FOR UPDATE
  USING (
    project_id IN (SELECT id FROM projects WHERE team_id = (auth.jwt()->>'team_id')::UUID)
  );

-- Audit logs: users can only read their own logs; service role writes them
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT
  USING (user_id = auth.uid());
