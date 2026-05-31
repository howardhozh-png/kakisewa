-- Trial management columns for agent_profiles
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)

ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS trial_started_at  timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at     timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status text
    CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled'));

-- Existing users get no trial gate (subscription_status stays NULL = treated as active)
-- Only newly-registered users will have subscription_status = 'trial' set on first login
