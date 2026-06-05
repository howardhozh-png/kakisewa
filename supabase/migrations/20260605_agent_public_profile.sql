-- Add public profile customisation fields to agent_profiles
ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS profile_strengths JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS profile_verbatim  JSONB DEFAULT NULL;
