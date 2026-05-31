-- Add columns to tenant_profiles that are referenced in code but may be missing from DB

ALTER TABLE tenant_profiles
  ADD COLUMN IF NOT EXISTS employer           TEXT,
  ADD COLUMN IF NOT EXISTS is_seeking         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS seeking_from       DATE,
  ADD COLUMN IF NOT EXISTS seeking_budget_max NUMERIC,
  ADD COLUMN IF NOT EXISTS budget_min         NUMERIC,
  ADD COLUMN IF NOT EXISTS bathrooms_pref     SMALLINT;
