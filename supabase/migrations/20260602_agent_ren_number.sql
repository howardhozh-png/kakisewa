-- Store REN number directly on agent_profiles (was only in auth user_metadata)
ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS ren_number text;
