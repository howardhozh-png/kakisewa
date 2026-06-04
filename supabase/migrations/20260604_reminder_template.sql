-- reminder_template: agent-editable WA copy for renewal reminders (Platinum/Elite)
-- trial_ends_at already exists from 20260530_trial_management.sql — no action needed

ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS reminder_template TEXT NULL;
