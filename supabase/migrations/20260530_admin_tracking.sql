-- Tracked outreach links and click events
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS ref_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  label       text NOT NULL,
  sends_count integer NOT NULL DEFAULT 0,  -- manually updated when you send a WhatsApp batch
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ref_clicks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id     uuid NOT NULL REFERENCES ref_links(id) ON DELETE CASCADE,
  ip          text,
  user_agent  text,
  clicked_at  timestamptz DEFAULT now()
);

-- Record which tracked link a user signed up through
ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS referral_slug text;

-- Fast lookup: clicks per link
CREATE INDEX IF NOT EXISTS idx_ref_clicks_link_id ON ref_clicks(link_id);
