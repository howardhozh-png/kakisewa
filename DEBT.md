# Technical Debt Backlog

Last audited: 2026-06-07

## Tier 2 — Fix in next debt session

- **Hardcoded colours in `components/intake-chat.tsx`** — 27 Apple-system hex values (#F2F2F7, #1C1C1E etc). Should map to CSS variables (`--kk-surface-2`, `--kk-ink`, etc).
- **Hardcoded colours in `components/tenants-table.tsx`** — 8 status hex values. Extract to `--kk-status-error`, `--kk-status-success`, `--kk-color-purple-accent`.
- **`subscription_plan` cast in `app/(app)/subscription/page.tsx:21`** — typed as `(agent as any).subscription_plan`. Define a proper `SubscriptionAgent` type with this field instead.
- **`add-property-button.tsx` naming confusion** — used only in `app/(app)/directory/page.tsx`. Clarify whether it should be replaced by `new-listing-button.tsx` or kept as a simpler inline variant.

## Tier 3 — Nice to have

- **Dialog/modal naming** — 12 components use `-dialog`, 3 use `-modal`. Pick one convention.
- **Console.log in webhook** — `app/api/webhooks/whatsapp/route.ts:155` logs WhatsApp outbound events. Remove or replace with proper logging before scaling.
- **Hardcoded `"#fff"` / `"#000"` scattered across components** — low risk but inconsistent with the design token system.
