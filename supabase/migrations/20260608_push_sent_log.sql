create table if not exists push_sent_log (
  id               uuid        default gen_random_uuid() primary key,
  created_at       timestamptz default now(),
  user_id          uuid        references auth.users not null,
  notification_key text        not null,
  unique(user_id, notification_key)
);

alter table push_sent_log enable row level security;

-- Only service role can access — no agent-facing queries needed
create policy "Service role only"
  on push_sent_log
  for all
  using (false);
