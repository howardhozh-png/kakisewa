# Technical Debt Backlog

Last audited: 2026-06-15

## Tier 2 — Needs decision before touching

- **Native `type="date"` inputs in styled dialogs** — iOS renders native picker, overrides styles. `convert-to-tenancy-dialog.tsx` and `edit-owner-lead-dialog.tsx` already route through `DateInput`. Remaining: `ui/date-input.tsx:74` itself uses a hidden native input as the picker trigger (intentional). No remaining raw date inputs outside of `DateInput`. ✓ Resolved for now.
- **Hardcoded colours in `components/intake-chat.tsx`** — intentional Apple/iMessage palette, centralized in `const C = {}`. Do not change without a deliberate design review.
- **4 parallel date picker implementations** — `date-input.tsx` (native), `date-range-filter.tsx` (best, react-day-picker), `intake-chat.tsx` (inline card), `month-picker-pill.tsx` (month popover). Fix: standardise on `date-range-filter.tsx` pattern.
- **13+ dialogs with no shared wrapper** — each reinvents backdrop, close button, button row. Fix: `components/ui/app-dialog.tsx` shared shell.
- **Triple CSS token system** — `--kk-*`, shadcn semantic (`--primary`), legacy (`--bg-base`). Fix: audit and delete legacy aliases.

## Tier 3 — Nice to have

- **Inline `fontSize` declarations (~100+ instances)** — in `top-nav.tsx`, `notification-bell.tsx`, `onboarding-demo-dialog.tsx`, `tenancies-timeline.tsx`, `month-picker-pill.tsx`, etc. Fix opportunistically when touching each file. Avoid changing on native `<input>` elements (iOS font-size interaction).
- **Hardcoded colours in `accent-provider.tsx`** — intentional: this file IS the theme engine, hardcoded hex is the source-of-truth palette. Do not change.
- **Hardcoded `"#fff"` / `"#000"` scattered across components** — low risk, fix opportunistically when editing those files.
- **Sidebar CSS tokens** (`--sidebar`, `--sidebar-foreground`) duplicate `--card` and `--primary` — could use `var()` references.
- **`--kk-*-soft` opacity** (0.10/0.12) scattered — no single `--kk-soft-opacity` token.
- **`router.refresh()` over-reliance (~77 instances)** — full page refresh after every mutation instead of optimistic updates. Fix when migrating to React 19 `useOptimistic`.

## Tier 2 (new — 2026-06-15)

- **Duplicate confirm-delete pattern** — 6 files independently manage `[confirmDelete, setConfirmDelete]` + inline confirm UI: `tenants-table`, `edit-competitor-dialog`, `tenancy-detail-dialog`, `edit-owner-lead-dialog`, `calendar-view`, `outreach-table`. Copy is now standardized. Extract to `<ConfirmDeleteBar />` in `components/ui/`.
- **Hardcoded `#25D366` (WhatsApp green)** — appears in `tenants-table.tsx:502,566` and others. Add `--kk-whatsapp: #25D366` to `globals.css` and reference it.
- **Highest-density hardcoded hex files** — `intake-chat.tsx` (palette object `C`) and `property-pack-share-viewer.tsx` (30+ instances) are the worst offenders for migration to CSS vars.

## Completed ✓

- **2026-06-24 debt run:** Deleted dead `stats-section-legacy.tsx` (595 lines) and `time-segment-input.tsx` (both had zero imports). Date input audit: `Field type="date"` already routes to `DateInput` (Popover + Calendar, iOS-safe) — no remaining native `type="date"` issues. All 26 DB tables confirmed active, none dropped.
- **2026-06-24 duplicate formatters (Tier 2, new):** `formatTime`, `fmtTime`, `formatDate`, `fmtDate`, `fmtDateLabel` duplicated across 7+ files. Extract to `lib/date-utils.ts` when next touching those files.

## Completed ✓ (pre-2026-06-24)

- **`cover_photo_index` never persisted** — `updateOwnerLead()` had no mapping. Fixed `lib/db.ts`.
- **`listing_purpose` never persisted** — same class of bug. Fixed `lib/db.ts`.
- **Dead components** — `bottom-tab-bar.tsx`, `guide-strip.tsx`, `ui/container-scroll-animation.tsx` deleted (zero imports).
- **Hardcoded reds in `profile-setup-dialog.tsx`** — replaced `#DC2626`, `#FEF2F2`, `#FECACA` with CSS vars.
- **Duplicate photo upload logic** — extracted to `hooks/use-photo-upload.ts`; used in `tenancy-detail-dialog` and `edit-owner-lead-dialog`.

- SW cache bumped kk-v3 → kk-v4
- Deleted dead `property-drawer.tsx`
- `subscription_plan` cast removed from subscription/page.tsx
- `console.log` removed from WhatsApp webhook
- `disable-model-invocation` removed from all 5 SKILL.md files
- `tenants-table.tsx`: extracted #6F2DA8, #1F8B4C, rgba green, #DC2626 to CSS vars
- Added `--kk-green-ink` and `--kk-purple-ink` tokens to globals.css
- `AddPropertyButton` renamed to `DirectoryAddButton`
- `--kk-red-bg` / `--kk-red-border` tokens added; `tenants-table.tsx` delete confirm updated
- Modal naming unified to `-dialog` convention (3 files renamed)
- `properties` table and `tenancies.property_id` column dropped from DB
- SW cache kk-v4 → kk-v5 (push notification handlers)
- SW cache kk-v5 → kk-v6 (stale module fix after dialog renames)
- File rename protocol added to GUIDELINES.md to prevent recurrence
- **2026-06-15 debt run:** Removed 4x `!important` from `.kk-week-*` in `globals.css`; replaced raw `<input type="date">` in `lifecycle-board.tsx:1196` with `DateInput`.
