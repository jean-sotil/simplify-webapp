CREATE INDEX idx_projects_team_id ON projects(team_id);
CREATE INDEX idx_projects_stage ON projects(stage);
CREATE INDEX idx_documents_team_id ON documents(team_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_analysis_project_id ON analysis_results(project_id);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
