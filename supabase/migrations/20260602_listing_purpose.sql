ALTER TABLE owner_leads
  ADD COLUMN IF NOT EXISTS listing_purpose text
    CHECK (listing_purpose IN ('rent', 'sell'));
