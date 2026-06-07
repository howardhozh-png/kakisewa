---
name: debt
description: Code health review — find CSS debt, duplicate patterns, dead code, shadcn violations, and scale blockers
---

Run a code health review: $ARGUMENTS

## Step 1 — Explore (Explore subagent)
Spawn an Explore subagent to scan for the following categories. Report every finding with file + line number.

### CSS Debt
```bash
# !important usage (flags specificity battles)
grep -rn "!important" app/globals.css components/

# Hardcoded colours (should be CSS variables)
grep -rn "#[0-9a-fA-F]\{3,6\}\|rgb(" components/ app/ --include="*.tsx" --include="*.ts"

# Native inputs in styled contexts (iOS will override)
grep -rn "type=\"date\"\|type=\"month\"\|type=\"time\"\|type=\"datetime" components/ app/

# Inline font-size overrides that will be beaten by global 16px rule
grep -rn "fontSize.*[0-9]\+" components/ --include="*.tsx" | grep -v "16\|style="
```

### Tailwind v4 Violations
```bash
# Compound selectors inside @media (stripped by Lightning CSS)
grep -n "@media" app/globals.css | head -20
# Then manually check each @media block for descendant selectors
```

### Duplicate Patterns
- Multiple components doing the same thing (e.g. two different date pickers, two filter dropdowns)
- Copy-pasted logic that should be a shared hook or utility
- CSS variable declarations that differ between light/dark mode for the same token

### Dead Code
```bash
# Unused imports
grep -rn "^import" components/ app/ --include="*.tsx" | grep -v "from"

# Components defined but never imported elsewhere
# (check exports vs grep for component name in the rest of codebase)
```

### shadcn Violations
- Custom UI components built when a shadcn equivalent exists in `components/ui/`
- Direct `@radix-ui/*` imports instead of using the shadcn wrappers

## Step 2 — Prioritise findings
Group into three tiers:
- **Blocks future work** — fix before next feature (e.g. `!important` that will fight future CSS, native inputs that will break on mobile)
- **Accumulates slowly** — fix in next debt session (e.g. duplicate components, dead code)
- **Nice to have** — only fix if touching that file anyway

## Step 3 — Plan fixes
For each Tier 1 item: write the exact fix (what changes, why, expected outcome).

**Show the prioritised list and Tier 1 plans. Wait for confirmation before executing.**

## Step 4 — Execute Tier 1 fixes
- Fix one item at a time
- Playwright verify after each change (390px mobile + 1280px desktop)
- Commit each fix separately with a clear message

## Step 5 — Report
- List all findings by tier
- Confirm which were fixed
- Leave Tier 2/3 in a `DEBT.md` file at the project root for tracking
