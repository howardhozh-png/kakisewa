# kakisewa Development Guidelines

## Stack
- **Next.js 16.2.4** with Turbopack — read `node_modules/next/dist/docs/` before touching routing, middleware, or async APIs. Heed deprecation notices.
- **Tailwind CSS v4** with Lightning CSS — CSS pipeline strips compound/descendant selectors inside `@media` blocks (e.g. `.kk-chart-ctrl select` won't survive). Use inline styles for critical sizing.
- **shadcn/ui** built on `@base-ui/react` (not Radix UI). Check `components/ui/` before building anything UI-related.
- **Supabase** (project: `binqdtfvyhipgwpiarkb`) for auth + data. Always use Supabase MCP for schema work.
- **Vercel** for deployment — auto-deploys when `main` is pushed. Push only via `/deploy` skill.

---

## Workflow: Explore → Plan → Execute (mandatory for every task)

1. **Explore** — use an Explore subagent to read the codebase and understand the full implication of the request. Check `MEMORY.md` for prior session context.
2. **Plan** — write out what you will change and why. Show the user before touching any file.
3. **Execute** — only after user confirms the plan.

Never skip to Execute without completing Explore and Plan first.

---

## Design — shadcn only

- **Never build a custom UI component** that already exists in `components/ui/`. Check there first.
- Use CSS variables: `var(--kk-ink)`, `var(--kk-surface)`, `var(--kk-theme-dark)`, etc. Never hardcode colours.
- Spacing, typography, and borders must use the existing design tokens defined in `app/globals.css`.
- For icons use `lucide-react` (already installed).
- shadcn component props are typed — always check the component's actual type definition before guessing prop names.

---

## File Rename Protocol (mandatory)

Renaming any component file breaks the Turbopack/SW module cache. Every time you rename a file in `components/` or `app/`:

1. Update **all** import paths via `sed` or global search.
2. **Bump `const CACHE` in `public/sw.js`** — increment the version number (e.g. `kk-v5` → `kk-v6`). Skipping this leaves the old SW serving stale JS chunks that reference the old module path, causing a "module factory not available" crash for all users.
3. Hard-restart the dev server: `lsof -ti :3000 | xargs kill -9 && rm -rf .next && npm run dev`
4. Tell the user to hard-reload (Cmd+Shift+R) to flush the old service worker.

---

## CSS Gotchas (hard-won)

| Problem | Why | Fix |
|---|---|---|
| Compound selectors stripped | Lightning CSS drops `.parent child` rules inside `@media` | Use inline `style={}` for sizing critical to responsive behaviour |
| `!important` stripped | Tailwind v4 compiles away `!important` from source | Use inline style; it always wins over stylesheet classes |
| `data-[attr=val]:h-X` ignores `!h-auto` | tailwind-merge can't resolve data-attribute conflicts | Add `height: 'auto'` to `style={}` directly |
| `input[type="month"]` huge on iOS | Safari renders it as a native date picker widget | Replace with Radix Popover + month grid or shadcn Select |
| Global `input { font-size: 16px }` on mobile | Prevents iOS zoom — intentional — but overrides inline fontSize | Use inline `style={{ fontSize: 16 }}` + `transform: scale()` or avoid native inputs |

---

## Mobile-first + Playwright (mandatory before every ship)

Every visible change must be verified in Playwright **before** reporting done:

1. Resize to **390×844** (iPhone 14 mobile)
2. Take a screenshot and confirm the feature renders correctly
3. Resize to **1280×800** (desktop) and confirm no regression
4. Check interactive states (open/close, select, click) where relevant

```js
// Standard Playwright check sequence
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'mobile-check.png' });
await page.setViewportSize({ width: 1280, height: 800 });
await page.screenshot({ path: 'desktop-check.png' });
```

---

## Deployment

- **All work stays on localhost.** Run `npm run dev`, verify with Playwright, commit locally — but do NOT push.
- **`git push` only happens inside the `/deploy` skill.** That skill is the only place it belongs. Do not run `git push` anywhere else, under any circumstances, for any reason.
- After every localhost verification, end with: "Verified on localhost — run `/deploy` when you're ready to ship."
- Live users are on production. Pushing outside of `/deploy` exposes untested work to real users immediately via Vercel.
- Dev server cache issue: if UI changes don't appear, run `lsof -ti :3000 | xargs kill -9 && rm -rf .next && npm run dev`.

---

## Database — Supabase MCP

- Before creating any new table, use Supabase MCP to list existing tables and check for overlap.
- Every new table must have: `id uuid default gen_random_uuid() primary key`, `created_at timestamptz default now()`, `user_id uuid references auth.users`.
- Enable Row Level Security on every user-facing table.
- After schema changes, check that all existing queries in `lib/` and `app/` still work.
- Never drop a table without first confirming it has zero references in the codebase.

---

## Context & Memory

- `MEMORY.md` is auto-loaded into every session. **At the start of every new session, before doing anything else, read every file linked in MEMORY.md and output a brief context brief:**
  - What kakisewa is and who it's for
  - What was pending or in-progress last session
  - Any workflow rules that apply (no dashes, deploy only on request, etc.)
  - Then ask: "Anything changed since last time, or shall I pick up where we left off?"
- Update `MEMORY.md` and the linked files whenever something changes: new pending items, decisions made, features shipped, objectives revised.
- Use the Explore subagent for broad codebase research — it doesn't bloat the main context window.
- `/clear` between unrelated tasks. Long sessions with accumulated corrections degrade quality — start fresh with a better prompt.
