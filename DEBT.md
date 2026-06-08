# Technical Debt Backlog

Last audited: 2026-06-08

## Tier 2 — Needs design decision before touching

- **Hardcoded colours in `components/intake-chat.tsx`** — intentional Apple/iMessage palette, centralized in `const C = {}`. Do not change without a deliberate design review.
- **`#FEF2F2` / `#FECACA`** in `tenants-table.tsx` delete confirm — solid light-red has no CSS var match. Leave until a `--kk-red-bg` / `--kk-red-border` token is added to the design system.

## Tier 3 — Nice to have

- **Dialog/modal naming** — 12 components use `-dialog`, 3 use `-modal` (`onboarding-demo-modal`, `photo-crop-modal`, `profile-setup-modal`). Pick one convention when next touching those files.
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
