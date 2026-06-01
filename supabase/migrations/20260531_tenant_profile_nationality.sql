-- Add nationality and occupation columns to tenant_profiles (safe if already exist)
ALTER TABLE tenant_profiles
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS occupation  TEXT;
