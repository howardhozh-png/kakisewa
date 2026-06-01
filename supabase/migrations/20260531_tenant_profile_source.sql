ALTER TABLE tenant_profiles
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
