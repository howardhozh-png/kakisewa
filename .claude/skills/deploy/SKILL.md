---
name: deploy
description: Production deployment workflow — pre-flight checks, git push, Vercel build wait, Playwright smoke test on kakisewa.com, fix any issues
---

Deploy to production: $ARGUMENTS

Follow this sequence exactly. Do not skip steps.

## Step 1 — Pre-flight checks
Before pushing anything:
- Run `git status` — confirm no uncommitted changes that should be part of this deploy
- Run `git log origin/main..HEAD --oneline` — list every commit about to be pushed; share with user
- Confirm TypeScript compiles: `npx tsc --noEmit` (fix any errors before proceeding)
- Confirm no obvious console errors by starting dev server if not already running

If any check fails, fix it before proceeding.

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

## Step 4 — Evaluate results
- If all screenshots look correct: report "Production verified ✓" with screenshot summary
- If any issue found:
  1. Describe the bug clearly
  2. Fix it locally (follow `/feature` workflow for UI bugs)
  3. Commit the fix
  4. Run Step 2 again (push → wait → re-verify)
  5. Repeat until clean

## Step 5 — Report to user
- Show key screenshots (landing mobile, sign-in, sign-up)
- List what was deployed (commit hashes and summaries)
- Confirm production is healthy
- Note any issues found and fixed

## Common production issues and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Old UI still showing after push | Service worker stale cache | Bump `CACHE` version in `public/sw.js`, push again |
| Build fails on Vercel | TypeScript error not caught locally | Run `npx tsc --noEmit` locally, fix errors |
| Auth redirects not working | Supabase redirect URL not set | Add `https://kakisewa.com/**` to Supabase allowed redirect URLs |
| CSS variables missing | `globals.css` not imported | Check `app/layout.tsx` imports globals |
| API route 500 errors | Missing env vars on Vercel | Check Vercel project settings → Environment Variables |
