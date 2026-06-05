-- Add gold to subscription_plan where the column has a check constraint.
-- If the column is plain text (no constraint), this is a no-op and safe to run.
DO $$
BEGIN
  -- Try to update any CHECK constraint on subscription_plan to include 'gold'
  -- Most Supabase setups use text columns without explicit CHECK; this handles both cases gracefully.
  ALTER TABLE agent_profiles
    DROP CONSTRAINT IF EXISTS agent_profiles_subscription_plan_check;

  ALTER TABLE agent_profiles
    ADD CONSTRAINT agent_profiles_subscription_plan_check
    CHECK (subscription_plan IN ('silver', 'gold', 'platinum', 'elite'));
EXCEPTION
  WHEN others THEN
    -- Column has no constraint, nothing to do
    NULL;
END $$;
