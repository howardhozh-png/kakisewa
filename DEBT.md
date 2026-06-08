# Technical Debt Backlog

Last audited: 2026-06-07

## Tier 2 — Fix in next debt session

- **Hardcoded colours in `components/intake-chat.tsx`** — 27 Apple-system hex values (#F2F2F7, #1C1C1E etc). Need design decision before touching — values differ from CSS variables so a swap changes appearance.
- **Hardcoded colours in `components/tenants-table.tsx`** — 8 status hex values (#DC2626, #1F8B4C, #6F2DA8). Same caveat — different shades from `--kk-red`/`--kk-green`/`--kk-purple`.
- **`add-property-button.tsx` naming confusion** — used only in `app/(app)/directory/page.tsx`. Clarify whether it should stay as a simpler inline variant or be replaced by `new-listing-button.tsx`.

## Tier 3 — Nice to have

- **Dialog/modal naming** — 12 components use `-dialog`, 3 use `-modal`. Pick one convention.
- **Hardcoded `"#fff"` / `"#000"` scattered across components** — low risk but inconsistent with the design token system.

## Completed ✓

- SW cache bumped kk-v3 → kk-v4 (fixes stale bundle revert on refresh)
- Deleted dead `property-drawer.tsx` (239 lines, zero imports)
- `subscription_plan` cast removed — `AgentProfile` already typed it
- `console.log` removed from WhatsApp webhook route
- `disable-model-invocation` removed from all 5 SKILL.md files
