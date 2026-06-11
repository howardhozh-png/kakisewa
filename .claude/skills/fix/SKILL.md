---
name: fix
description: Bug fix workflow — diagnose root cause, not symptoms; verify with Playwright before reporting done
---

Fix the bug: $ARGUMENTS

Follow this sequence exactly.

## Step 1 — Explore root cause (do not guess)
Before touching any file:
- Check MEMORY.md for prior fixes in this area
- Use Playwright to reproduce the bug at 390px mobile and 1280px desktop
- Take a screenshot showing the actual broken state
- Inspect computed styles if it's a visual bug: `getComputedStyle(element)` via `browser_evaluate`
- Read the relevant component files — understand the full data/render flow

Common root causes to check first:
- **CSS**: Is a global `@media` rule overriding inline styles? (`input { font-size: 16px !important }`)
- **Tailwind v4**: Is a compound selector being stripped? (`.parent child` inside `@media` doesn't survive Lightning CSS)
- **Data-attribute classes**: Does `data-[x=y]:h-9` beat `h-auto`? (use inline `style={{ height: 'auto' }}` to fix)
- **iOS native inputs**: Is `input[type="date/month"]` rendering at native size? (replace with Radix Popover)
- **Turbopack cache**: Is the dev server serving stale JS? (`rm -rf .next`)

## Step 2 — Plan the fix
State clearly:
1. Root cause (one sentence)
2. Exact files and lines to change
3. Why this fix addresses the root cause, not the symptom

**Show the plan. Wait for confirmation if the fix touches auth, middleware, or schema.**

## Step 3 — Fix
- Make the minimal change that fixes the root cause
- Do not clean up surrounding code unless it's part of the fix
- If fixing CSS: prefer inline `style={}` over stylesheet overrides
- **Bump SW cache**: always increment `const CACHE` in `public/sw.js` (e.g. `kk-v13` → `kk-v14`) after any fix. Browsers cache `/_next/static/` chunks at the old SW version — without bumping, users see old code even after a deploy.
- Restart dev server after changes: `lsof -ti :3000 | xargs kill -9 2>/dev/null; rm -rf .next && npm run dev`

## Step 4 — Playwright verify
1. Resize to 390px, reproduce the original bug scenario — confirm it's fixed
2. Resize to 1280px — confirm no desktop regression
3. Screenshot both states

**Do not report the fix as done without screenshots confirming it works.**

## Step 5 — Commit and report
```bash
git add <files> && git commit -m "Fix: <one-line root cause description>"
```

Tell the user: "Fixed. Verified mobile + desktop. Ready to deploy — say 'deploy to production' to push."

**Never push to production unless the user explicitly says so.**
