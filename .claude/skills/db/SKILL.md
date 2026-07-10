---
name: db
description: Database/Supabase workflow — review schema, check codebase references, consolidate tables, build clean migrations
---

Database task: $ARGUMENTS

## Step 1 — Explore existing schema (Supabase MCP)
Use Supabase MCP to:
- List all tables and their row counts
- List all foreign key relationships
- List all RLS policies
- Identify tables with 0 rows that are not referenced in code (candidates to drop)

Also search the codebase:
```bash
grep -r "from.*'<table_name>'\|\.from('<table_name>')" app/ lib/ components/ --include="*.ts" --include="*.tsx"
```
For every table, confirm it has at least one active query in the codebase. Tables with no references are dead weight.

## Step 2 — Plan changes
For each proposed change (create / alter / drop), state:
1. What the change is
2. Why it's needed
3. Which existing queries it affects
4. Migration SQL

**For any new column used as a state/behavior flag (not just data storage)** — e.g. a
timestamp or boolean the app reads to decide whether to show something, gate something,
or redirect somewhere — state explicitly what the default/NULL value means for rows that
**already exist**, not just new ones. A nullable column added to an existing table takes
that NULL value for every current row. If the app logic treats NULL as "hasn't happened
yet," every existing row just became "hasn't happened yet" too, whether or not that's
true. If this retroactively changes behavior for existing users, the migration is not
complete until it includes a backfill for the rows that shouldn't be swept into the new
behavior — in the same step, not a follow-up.

(This is exactly what caused a production incident: a column added to gate a new-user
tour was NULL for every existing account, dropping established beta users with 100+
tenancies into a tour meant for someone who'd just signed up.)

**STOP. Show the full plan including migration SQL before executing.**

For new tables, always include:
```sql
id uuid default gen_random_uuid() primary key,
created_at timestamptz default now() not null,
user_id uuid references auth.users not null
```

Always enable RLS:
```sql
alter table <table> enable row level security;
create policy "Users see own rows" on <table>
  for all using (auth.uid() = user_id);
```

## Step 3 — Execute (only after confirmation)
- Run migrations via Supabase MCP
- Update `lib/types.ts` if the schema changes affect TypeScript types
- Update any affected queries in `app/` and `lib/`
- Run `npx tsc --noEmit` to confirm no type errors

## Step 4 — Verify
- Confirm the change worked via Supabase MCP (check table exists / was dropped)
- Do a quick Playwright smoke test on any page that queries the affected table
- Check that no existing features broke

## Rules
- Never drop a table without running the grep check first
- Never create a table that could be an extra column on an existing table
- Always prefer `uuid` over `int` for primary keys
- Never store user PII in a table without explicit RLS
