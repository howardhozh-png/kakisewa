---
name: verify
description: Health check — confirms code compiles, SW cache is current, dev server works, and Playwright screenshots the key pages
---

Run a full health check on the codebase: $ARGUMENTS

Follow this sequence exactly.

## Step 1 — TypeScript
```bash
npx tsc --noEmit 2>&1
```
Zero errors required. Fix any errors before proceeding.

## Step 2 — SW cache version
Read `public/sw.js` line 1. Note the current CACHE version.
Check the last git commit that touched `public/sw.js`:
```bash
git log --oneline -5 -- public/sw.js
```
**If the CACHE version hasn't been bumped since the last component change, bump it now** (e.g. `kk-v13` → `kk-v14`). This is the #1 reason changes don't appear in the browser.

## Step 3 — Dev server
Kill and restart clean:
```bash
lsof -ti :3000 | xargs kill -9 2>/dev/null; rm -rf .next && npm run dev > /tmp/kk-dev.log 2>&1 &
```
Wait 12 seconds, then confirm it's up:
```bash
sleep 12 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/sign-in
```
Expected: `200`. If not, print last 30 lines of `/tmp/kk-dev.log` to diagnose.

## Step 4 — Playwright screenshots
Take screenshots of 3 key pages to confirm nothing is visually broken.
Use mobile (390×844) and desktop (1280×800):

```js
// Sign-in page
await page.goto('http://localhost:3000/sign-in');
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'verify-signin-mobile.png' });
await page.setViewportSize({ width: 1280, height: 800 });
await page.screenshot({ path: 'verify-signin-desktop.png' });
```

If the user mentions a specific page to check, screenshot that too.

## Step 5 — Report
List:
- TypeScript: PASS / FAIL (with errors if any)
- SW cache version: current value, whether it was bumped
- Dev server: HTTP status
- Screenshots: attach and note any visual regressions

End with one of:
- "All checks pass. Run `/deploy` when ready."
- "Issues found: [list]. Fix before deploying."

## When to use
Run `/verify` any time you're unsure if changes are actually loading in the browser, or before running `/deploy`. Also run it after any batch of fixes to confirm the codebase is healthy.
