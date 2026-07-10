---
name: audit
description: Targeted risk sweep across the whole codebase for the specific bug classes that caused the July 2026 onboarding-tour production incident — overlay z-index conflicts, migration blast-radius on existing rows, account-state gating logic untested against realistic data, and features missing mobile Playwright verification. Not a generic code review.
---

Run a comprehensive risk audit: $ARGUMENTS

This is not a generic "review everything" pass — full-codebase reads are slow and low-signal.
This hunts specifically for four proven bug patterns, each of which has already caused a real
production incident in this codebase. Run all four in parallel (they're independent).

## Step 1 — Spawn four parallel Explore agents

Spawn all four in a single message so they run in parallel:

**Agent A — Overlay z-index conflicts**
- Find every component that renders a `fixed inset-0` overlay, modal, dialog, or spotlight
  (grep for `fixed inset-0`, `z-\[`, `zIndex`, `position: "fixed"`)
- List each with its z-index value and the condition under which it renders
- For any two that could plausibly be eligible to render at the same time (e.g. both gate on
  "is this a new/incomplete account"), confirm the higher one is intentionally higher and that
  a lower one doesn't silently swallow clicks meant for the one on top (a transparent full-page
  blocker above something still-interactive is invisible until someone actually tries to click
  through it)

**Agent B — Migration blast-radius on existing rows**
- List every column on tables that already had rows before it was added (check `created_at` /
  git history of schema changes if available, or just treat every non-trivial existing table as
  "already has real rows")
- For each column the app code reads as a state/behavior flag (not just data — something that
  gates, redirects, or branches rendering), state what NULL/the default means for a row that
  existed before the column did. Flag any where that meaning doesn't match what a genuinely new
  row would have, unless a backfill already handled it (check `scripts/` and recent commits)

**Agent C — Account-state gating logic vs. realistic data**
- Find every place the app branches on account state to decide what to show or where to send
  the user (onboarding gates, plan-cap checks, trial-status checks, profile-completeness checks,
  "most recent X" queries used to pick a target)
- For each, identify what assumption it makes about data shape (e.g. "the most recent row is
  representative," "count > 0 means usable") and whether that assumption could break for an
  account with high volume, mixed statuses, or edge-case values — the same shape of bug as
  `getMostRecentTenancyId()` picking a closed tenancy

**Agent D — Mobile verification gaps**
- Search recent commit history (`git log --oneline -50`) for UI/UX features
- For each, check whether there's evidence of actual mobile-viewport testing (390px) — not just
  desktop. Flag anything that looks like it was only ever verified at 1280×800

Each agent should report findings as a concise list: file:line, what the risk is, and severity
(confirmed bug / plausible risk / low-priority polish). Cap each agent's report at ~400 words —
this is a scan for candidates, not a full writeup per finding.

## Step 2 — Synthesize and report

Do not silently fix anything found. Present all four agents' findings together, grouped by
pattern, ranked by severity. For each finding, state clearly whether it's:
- **Confirmed** — you or the agent verified the actual broken behavior
- **Plausible** — the pattern matches but wasn't independently verified

Let the user decide what to fix now vs. later. This is a discovery pass, not a fix pass — if
they want fixes, that's a separate `/fix` per finding (or a batch, if they ask for it explicitly).

## When to use
Run after any feature that adds account-state-dependent gating/redirect logic, after any schema
migration, or periodically as a standing health check. Not meant to run on every commit — it's a
deliberate, occasional sweep, not part of the normal `/feature` or `/fix` loop.
