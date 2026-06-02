-- Performance indexes for scale
-- All hot query paths filter by user_id; these ensure O(log n) lookups regardless of row count

CREATE INDEX IF NOT EXISTS idx_owner_leads_user_id       ON owner_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_owner_leads_stage          ON owner_leads(user_id, stage);
CREATE INDEX IF NOT EXISTS idx_tenancies_user_id          ON tenancies(user_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_contract_end     ON tenancies(user_id, contract_end);
CREATE INDEX IF NOT EXISTS idx_properties_user_id         ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_property_supports_user_id  ON property_supports(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_user_id    ON tenant_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_events_user_id  ON commission_events(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_status      ON agent_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_trial_ends  ON agent_profiles(trial_ends_at) WHERE subscription_status = 'trial';
