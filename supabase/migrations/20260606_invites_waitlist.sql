-- Invite-only beta gate
CREATE TABLE IF NOT EXISTS invites (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email      text UNIQUE NOT NULL,
  invited_at timestamptz DEFAULT now(),
  used_at    timestamptz
);
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Waitlist for non-invited signup attempts
CREATE TABLE IF NOT EXISTS waitlist (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name           text,
  email          text NOT NULL,
  ren_number     text,
  expected_spend text,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_insert_waitlist ON waitlist FOR INSERT WITH CHECK (true);
