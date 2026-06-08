# Technical Debt Backlog

Last audited: 2026-06-08

## Tier 2 — Needs design decision before touching

- **Hardcoded colours in `components/intake-chat.tsx`** — intentional Apple/iMessage palette, centralized in `const C = {}`. Do not change without a deliberate design review.

## Tier 3 — Nice to have

- **Hardcoded `"#fff"` / `"#000"` scattered across components** — low risk, fix opportunistically when editing those files.

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
