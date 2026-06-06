-- Add beta and beta_frozen to subscription_status check constraint
-- Also rename existing 'trial' users to 'beta' status

-- 1. Drop old constraint
ALTER TABLE agent_profiles
  DROP CONSTRAINT IF EXISTS agent_profiles_subscription_status_check;

-- 2. Add new constraint with beta + beta_frozen
ALTER TABLE agent_profiles
  ADD CONSTRAINT agent_profiles_subscription_status_check
  CHECK (subscription_status IN ('beta', 'beta_frozen', 'trial', 'active', 'expired', 'cancelled'));

-- 3. Migrate existing 'trial' users to 'beta'
UPDATE agent_profiles
  SET subscription_status = 'beta'
  WHERE subscription_status = 'trial';
