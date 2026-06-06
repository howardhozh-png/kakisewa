---
name: feature
description: Full feature development workflow — explore, plan, shadcn design, Playwright test on mobile + web
disable-model-invocation: true
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
- Start dev server: `lsof -ti :3000 | xargs kill -9 2>/dev/null; rm -rf .next && npm run dev`

## Step 4 — Playwright verify (mandatory)
Run all scenarios from the plan:

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

Do not report the feature as done until all scenarios pass.

## Step 5 — Report to user
- Show screenshots
- List what was built
- Say: "Verified on mobile and desktop. Ready to deploy — say 'deploy to production' when you've checked localhost."

**Never push to production unless the user explicitly says so.**
