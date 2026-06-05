-- Trial downgrade: flag for one-time post-downgrade notice, and pack link pausing
ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS trial_downgrade_archived_count INTEGER NULL;

ALTER TABLE match_packs
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT FALSE;
