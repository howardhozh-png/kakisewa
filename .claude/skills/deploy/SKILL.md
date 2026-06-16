---
name: deploy
description: Production deployment workflow — pre-flight checks, git push, Vercel build wait, Playwright smoke test on kakisewa.com, fix any issues
---

Deploy to production: $ARGUMENTS

> **This is the only place `git push` is ever run.** Outside this skill, commits stay local.
> Running this skill is Howard's explicit sign-off to ship to kakisewa.com.
> **Real beta users are on production.** Treat every deploy as live-traffic — prefer catching a problem
> here over a beta user catching it first.

Follow this sequence exactly. Do not skip steps.

## Step 1 — Pre-flight checks

Before pushing anything:
- Run `git status` — confirm no uncommitted changes that should be part of this deploy
- Run `git log origin/main..HEAD --oneline` — list every commit about to be pushed; share with user
- Confirm TypeScript compiles: `npx tsc --noEmit` (fix any errors before proceeding)
- Confirm no obvious console errors by starting dev server if not already running

If any check fails, fix it before proceeding.

### 1a. Classify the diff
Run `git diff origin/main..HEAD --name-only` and bucket every file:

| Bucket | Path patterns |
|---|---|
| UI/UX | `components/**/*.tsx`, `app/**/*.tsx` (excluding `app/api/**`), `app/globals.css`, `public/*.html`, `public/*.css` |
| Backend/logic | `lib/**`, `app/api/**` |
| Config/infra | `next.config.ts`, `proxy.ts` / `middleware.ts`, `package.json`, env files |
| Schema/data | no files (Supabase changes are applied live via MCP, not migration files in this repo) |

### 1b. UI/UX change alarm — mandatory if the UI/UX bucket is non-empty
Beta users will see this the moment the build finishes — there is no staging buffer. If any file lands in
the UI/UX bucket:
1. Print a clearly-marked banner, e.g.:
   ```
   ⚠️  UI/UX CHANGE — beta users will see this immediately on deploy
   Files: components/owner-pipeline-board.tsx, components/lifecycle-board.tsx, ...
   What changed: <one line per commit, pulled from commit messages>
   ```
2. Fire a real alarm, not just a log line — call `PushNotification` with a one-line summary
   (e.g. `"Deploying UI change: board card photos now use next/image — confirm?"`).
3. **Stop and wait for explicit confirmation** ("yes, ship it" or equivalent) before moving to Step 2.
   Do not infer confirmation from the user having run `/deploy` — the alarm is the second, specific
   checkpoint for visual/UX risk, separate from the general decision to deploy.

If the UI/UX bucket is empty (backend-only or config-only deploy), skip the alarm and say so explicitly
in the pre-flight summary ("No UI/UX changes in this deploy") so Howard knows why it didn't fire.

### 1c. Database safety check
If any commit this session ran Supabase schema changes (new tables, columns, RLS policies — check
session history, since this repo has no migration files to diff):
- Run `mcp__supabase__get_advisors` (security and performance lints) and report any new findings
- Confirm RLS is enabled on any new table
- Confirm the change was already tested against existing queries (per the `/db` skill)

If nothing schema-related changed, skip this and say so.

### 1d. Record rollback target
Before pushing, capture the currently-live production deployment so there's an instant rollback path:
```
npx vercel ls --prod 2>/dev/null | head -5
```
Note the current production deployment URL/ID. If Step 3 finds a broken build, this is what you roll
back to.

## Step 2 — Push to production
```
git push origin main
```
Vercel auto-deploys from `main`. After pushing:
- Note the push timestamp
- Wait for Vercel build to complete — poll with:
  ```
  npx vercel --version 2>/dev/null; curl -s "https://api.vercel.com/v6/deployments?teamId=&limit=1" -H "Authorization: Bearer $VERCEL_TOKEN"
  ```
  Or simply wait ~60–90 seconds for the Vercel build to finish before running Playwright.

## Step 3 — Playwright smoke tests on production
Connect to Playwright MCP and run these tests against `https://kakisewa.com`:

### 3a. Landing page
```js
await page.goto('https://kakisewa.com');
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'prod-landing-mobile.png' });
await page.setViewportSize({ width: 1280, height: 800 });
await page.screenshot({ path: 'prod-landing-desktop.png' });
```
Confirm: page loads, no JS errors, hero renders correctly.

### 3b. Sign-in page
```js
await page.goto('https://kakisewa.com/sign-in');
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'prod-signin-mobile.png' });
```
Confirm: email field, 8-box passcode input render; no stale cached UI.

### 3c. Sign-up page
```js
await page.goto('https://kakisewa.com/sign-up');
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'prod-signup-mobile.png' });
```
Confirm: only email + passcode fields (no Name/Agency); placeholder text is light grey.

### 3d. Authenticated flows (if test credentials available)
Sign in with test account, then:
- Navigate to `/home` — confirm profile nudge banner appears if profile incomplete
- Navigate to `/existing-contracts` — open Add Tenancy, select existing property, confirm only property name is filled (not owner name/phone/date)
- Navigate to `/new-owners` — open Add Listing, select existing property, confirm only property name is filled

### 3e. Core pages load check
```js
for (const path of ['/home', '/existing-contracts', '/new-owners', '/settings/account']) {
  await page.goto(`https://kakisewa.com${path}`);
  // Should redirect to sign-in if not authenticated — that's fine
  await page.screenshot({ path: `prod-${path.replace(/\//g, '-')}.png` });
}
```

### 3f. Targeted re-check of changed UI (only if Step 1b fired)
If the UI/UX alarm fired in Step 1, also navigate specifically to the screens those files affect
(not just the generic list above) and screenshot them on production — the same scenarios that were
verified on localhost, now re-verified live. This is the actual point of the alarm: prove the exact
thing that changed is correct in front of real users, not just that the site loads.

## Step 4 — Evaluate results
- If all screenshots look correct: report "Production verified ✓" with screenshot summary
- If any issue found, **protect beta users first, debug second**:
  1. Roll back immediately to the deployment recorded in Step 1d:
     ```
     npx vercel rollback <deployment-url-or-id>
     ```
  2. Confirm rollback is live (re-run the relevant Step 3 screenshot against production)
  3. Describe the bug clearly, then fix it locally (follow `/fix` or `/feature` workflow)
  4. Commit the fix
  5. Run Step 2 again (push → wait → re-verify)
  6. Repeat until clean

## Step 5 — Report to user
- Show key screenshots (landing mobile, sign-in, sign-up, plus any targeted re-checks from 3f)
- List what was deployed (commit hashes and summaries)
- Repeat the UI/UX change summary from Step 1b if it fired, so there's a record of every visual
  change that went to beta users and when
- Confirm production is healthy
- Note any issues found, and whether a rollback was needed

## Common production issues and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Old UI still showing after push | Service worker stale cache | Bump `CACHE` version in `public/sw.js`, push again |
| Build fails on Vercel | TypeScript error not caught locally | Run `npx tsc --noEmit` locally, fix errors |
| Auth redirects not working | Supabase redirect URL not set | Add `https://kakisewa.com/**` to Supabase allowed redirect URLs |
| CSS variables missing | `globals.css` not imported | Check `app/layout.tsx` imports globals |
| API route 500 errors | Missing env vars on Vercel | Check Vercel project settings → Environment Variables |
| Smoke test fails post-deploy | Bug shipped despite local verification | Roll back first (`vercel rollback`), then debug locally — don't leave beta users on a broken build while fixing |
