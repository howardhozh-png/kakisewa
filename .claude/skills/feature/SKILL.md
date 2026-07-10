---
name: feature
description: Full feature development workflow — explore, plan, shadcn design, Playwright test on mobile + web
---

Build the feature: $ARGUMENTS

Follow this sequence exactly. Do not skip steps.

## Step 1 — Explore (subagent)
Spawn an Explore subagent with these instructions:
- Read MEMORY.md for prior session context and decisions
- Find all files relevant to the requested feature (routes, components, DB queries, types)
- Identify which shadcn components in `components/ui/` could be reused
- Check `app/globals.css` for existing CSS variables and design tokens
- Note any existing patterns in similar features
- Report: files to change, shadcn components available, potential gotchas

## Step 2 — Plan (show user before executing)
Write a numbered implementation plan covering:
1. Files to create or modify
2. shadcn components to use (never build custom if shadcn has it)
3. Database changes needed (if any) — check with Supabase MCP first
4. Playwright test scenarios: list every interaction to verify on mobile + desktop

**STOP and show the plan to the user. Wait for confirmation before Step 3.**

## Step 3 — Execute
- Follow the plan exactly
- Use only shadcn components from `components/ui/` for all UI
- Use CSS variables (`var(--kk-ink)`, `var(--kk-surface)`, etc.) — never hardcode colours
- Avoid `input[type="date/month/time"]` in styled contexts — iOS renders native; use Radix Popover or shadcn Select instead
- For critical sizing, use inline `style={}` not Tailwind classes (Lightning CSS strips compound selectors in `@media`)
- **Bump SW cache**: after ALL code changes, increment `const CACHE` in `public/sw.js` (e.g. `kk-v13` → `kk-v14`). Skipping this means browsers serve stale JS and changes won't appear.
- Start dev server: `lsof -ti :3000 | xargs kill -9 2>/dev/null; rm -rf .next && npm run dev`

## Step 4 — Playwright verify (mandatory)
Run all scenarios from the plan. First do a hard reload to clear the old SW cache:

```
Mobile (390×844):
- Navigate to the page
- Screenshot the feature closed/default state
- Interact with every control (click, select, open/close)
- Screenshot each state
- Confirm nothing overflows or clips

Desktop (1280×800):
- Repeat above
- Confirm no regression in surrounding layout
```

**If this feature gates, redirects, or changes what renders based on account state**
(onboarding flows, plan limits, data-completeness checks, anything that reads "does this
account have X" and branches on it) — testing must include at least one account seeded
with realistic existing data, not only a freshly created, clean disposable account. Seed
volume and edge-case values that resemble real production accounts (e.g. many rows, a
mix of statuses, an old/closed/inactive record as the most-recently-created one) and
confirm the feature behaves correctly against that shape too. A fresh test account can't
surface bugs that only exist once an account has history — a real incident happened
because every test this feature was verified against was clean and synthetic, while the
actual failure only showed up for accounts with pre-existing, high-volume, mixed-status
data.

Do not report the feature as done until all scenarios pass, on both viewports, against
both a fresh account and a realistic-data account where applicable.

## Step 5 — Commit and report to user
Always commit before reporting done:
```bash
git add <specific files> && git commit -m "Feature: <description>\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

- Show screenshots
- List what was built
- Say: "Verified on mobile and desktop. Ready to deploy — say 'deploy to production' when you've checked localhost."

**Never push to production unless the user explicitly says so.**
