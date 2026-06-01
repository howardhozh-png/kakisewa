-- Stripe subscription columns for agent_profiles
ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id              text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id         text,
  ADD COLUMN IF NOT EXISTS stripe_price_id                text,
  ADD COLUMN IF NOT EXISTS subscription_plan              text CHECK (subscription_plan IN ('silver', 'platinum', 'elite')),
  ADD COLUMN IF NOT EXISTS subscription_interval          text CHECK (subscription_interval IN ('monthly', 'annual')),
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;
