CREATE TABLE IF NOT EXISTS feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    text NOT NULL,
  agent_name  text,
  agent_email text,
  category    text NOT NULL CHECK (category IN ('bug', 'suggestion', 'question')),
  message     text NOT NULL,
  page_url    text,
  resolved    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_insert_own_feedback" ON feedback
  FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid()::text);

CREATE POLICY "service_role_all_feedback" ON feedback
  FOR ALL TO service_role
  USING (true);
