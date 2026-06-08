# Technical Debt Backlog

Last audited: 2026-06-08

## Tier 1 — Fixed this session ✓
- All 8 `!important` rules removed from `globals.css` (scrollbars, input font-size, react-day-picker)
- Property name combobox in `new-listing-button.tsx`: selecting a suggestion no longer overwrites owner name/phone
- Sidebar rebuilt from scratch (shadcn/sidebar style, click-toggle with localStorage persistence)
- Notification bell rebuilt (Vercel-style, All/Unread tabs, mobile bottom sheet)
- `bottom-tab-bar.tsx` — confirmed dead code (see Tier 2 below for deletion)

## Tier 2 — Needs decision before touching

- **Native `type="date"` inputs in styled dialogs** — iOS renders native picker, overrides styles. Files: `convert-to-tenancy-dialog.tsx:105`, `edit-owner-lead-dialog.tsx:242`, `ui/date-input.tsx:74`. Fix: Popover + react-day-picker (same as `date-range-filter.tsx`).
- **80+ hardcoded hex colours in components** — `profile-setup-dialog.tsx` (6×), `accent-provider.tsx` (41× — intentional theme palette), `add-support-button.tsx`, `onboarding-nudge.tsx`, `date-range-filter.tsx`. Fix: replace with `--kk-*` variables where not intentional.
- **Hardcoded colours in `components/intake-chat.tsx`** — intentional Apple/iMessage palette, centralized in `const C = {}`. Do not change without a deliberate design review.
- **4 parallel date picker implementations** — `date-input.tsx` (native), `date-range-filter.tsx` (best, react-day-picker), `intake-chat.tsx` (inline card), `month-picker-pill.tsx` (month popover). Fix: standardise on `date-range-filter.tsx` pattern.
- **13+ dialogs with no shared wrapper** — each reinvents backdrop, close button, button row. Fix: `components/ui/app-dialog.tsx` shared shell.
- **Dead code**: `bottom-tab-bar.tsx` and `guide-strip.tsx` — both never imported. Safe to delete.
- **Triple CSS token system** — `--kk-*`, shadcn semantic (`--primary`), legacy (`--bg-base`). Fix: audit and delete legacy aliases.

## Tier 3 — Nice to have

- **Hardcoded `"#fff"` / `"#000"` scattered across components** — low risk, fix opportunistically when editing those files.
- **Sidebar CSS tokens** (`--sidebar`, `--sidebar-foreground`) duplicate `--card` and `--primary` — could use `var()` references.
- **`--kk-*-soft` opacity** (0.10/0.12) scattered — no single `--kk-soft-opacity` token.

## Completed ✓

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
