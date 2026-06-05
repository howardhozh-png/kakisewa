-- Track when an owner last ranked/saved in the tenant pack
ALTER TABLE match_packs
  ADD COLUMN IF NOT EXISTS owner_ranked_at TIMESTAMPTZ NULL;
