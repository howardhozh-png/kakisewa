import { test, expect } from "@playwright/test";
import Database from "better-sqlite3";
import path from "path";

// ── DB helpers ──────────────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), ".data");
const db = new Database(path.join(DATA_DIR, "kakisewa.db"));

function seedTestTenancy() {
  // Use unique IDs so each run is clean
  const propId = `prop_test_ol_${Date.now()}`;
  const tenId  = `ten_test_ol_${Date.now()}`;

  // Clean up any prior test entries
  db.prepare(`DELETE FROM tenancies   WHERE id LIKE 'ten_test_ol_%'`).run();
  db.prepare(`DELETE FROM properties  WHERE id LIKE 'prop_test_ol_%'`).run();
  db.prepare(`DELETE FROM owner_leads WHERE notes LIKE '%PLAYWRIGHT-OL-TEST%'`).run();
  db.prepare(`DELETE FROM tenant_profiles WHERE name = 'PW Test Tenant OL'`).run();

  db.prepare(`
    INSERT INTO properties (id, name, address, owner_name, owner_phone, photo_urls)
    VALUES (?, 'PW Test Property OL', '1 Test St', 'PW Test Owner OL', '60100000001', '[]')
  `).run(propId);

  // Contract ends in 30 days → lifecycle board shows it in Expiring (headsup)
  const contractEnd = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  db.prepare(`
    INSERT INTO tenancies
      (id, property_id, tenant_name, tenant_phone, due_day, amount,
       current_month_paid, lhdn_status, status, contract_end, lifecycle_stage,
       replied_tenant, replied_owner)
    VALUES (?, ?, 'PW Test Tenant OL', '60100000002', 1, 2500,
            0, 'none', 'Pending', ?, 'headsup', 'pending', 'pending')
  `).run(tenId, propId, contractEnd);

  return { propId, tenId, contractEnd };
}

function cleanup(propId: string, tenId: string) {
  db.prepare(`DELETE FROM tenancies   WHERE id = ?`).run(tenId);
  db.prepare(`DELETE FROM properties  WHERE id = ?`).run(propId);
  db.prepare(`DELETE FROM owner_leads WHERE notes LIKE '%PLAYWRIGHT-OL-TEST%'`).run();
  db.prepare(`DELETE FROM tenant_profiles WHERE name = 'PW Test Tenant OL'`).run();
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe("Owner Leaving flow", () => {
  let propId: string;
  let tenId: string;
  let contractEnd: string;

  test.beforeEach(() => {
    ({ propId, tenId, contractEnd } = seedTestTenancy());
  });

  test.afterEach(() => {
    cleanup(propId, tenId);
  });

  test("card disappears from Expiring, owner in own_stay, tenant profile marked seeking", async ({ page }) => {
    // ── Navigate to lifecycle board ──────────────────────────────────────
    await page.goto("/tenancies");
    await page.waitForLoadState("networkidle");

    // Confirm card is visible in Expiring column
    const expiringCol = page.locator("[id='kk-col-headsup']");
    await expect(expiringCol).toContainText("PW Test Owner OL");

    // ── Select "Stop renting" from the What's next dropdown ─────────────
    // Cards are divs (data-card-id), not buttons. Find the card div that contains owner name.
    const card = expiringCol.locator("[data-card-id]", { hasText: "PW Test Owner OL" }).first();
    const select = card.locator("select");
    await select.selectOption("stop");

    // Confirmation dialog appears: "Stop renting"
    const firstDialog = page.locator("role=dialog");
    await expect(firstDialog).toBeVisible();
    await expect(firstDialog).toContainText("Stop renting");

    // Click "Archive & own stay →"
    await firstDialog.locator("button", { hasText: "Archive" }).click();

    // OwnerLeavingDialog now appears
    const ownerDialog = page.locator("role=dialog");
    await expect(ownerDialog).toContainText("Owner Leaving");
    await expect(ownerDialog).toContainText("PW Test Owner OL");
    await expect(ownerDialog).toContainText("PW Test Tenant OL");

    // Click Confirm
    await ownerDialog.locator("button", { hasText: "Confirm" }).click();

    // ── Wait for page to update ──────────────────────────────────────────
    await page.waitForLoadState("networkidle");
    // The board polls and refreshes; give it time for server action + router.refresh()
    await page.waitForTimeout(2000);

    // ── 1. Tenancy card should be gone from Expiring column ──────────────
    await expect(expiringCol).not.toContainText("PW Test Owner OL");

    // ── 2. Verify DB: tenancy archived with owner_leaving ─────────────────
    const tenRow = db.prepare(`SELECT lifecycle_stage, closed_reason FROM tenancies WHERE id = ?`).get(tenId) as
      { lifecycle_stage: string; closed_reason: string } | undefined;
    expect(tenRow?.lifecycle_stage).toBe("closed");
    expect(tenRow?.closed_reason).toBe("owner_leaving");

    // ── 3. Verify DB: owner_lead created with stage=own_stay ──────────────
    const leadRow = db.prepare(`SELECT stage FROM owner_leads WHERE owner_phone = '60100000001' ORDER BY created_at DESC LIMIT 1`).get() as
      { stage: string } | undefined;
    expect(leadRow?.stage).toBe("own_stay");

    // ── 4. Verify DB: tenant profile is_seeking=1 ─────────────────────────
    const profileRow = db.prepare(`SELECT is_seeking, seeking_budget_max FROM tenant_profiles WHERE phone = '60100000002' AND name = 'PW Test Tenant OL'`).get() as
      { is_seeking: number; seeking_budget_max: number } | undefined;
    expect(profileRow?.is_seeking).toBe(1);
    expect(profileRow?.seeking_budget_max).toBe(2500);

    // ── 5. Make New Money: owner appears under own_stay (with toggle) ─────
    await page.goto("/leads");
    await page.waitForLoadState("networkidle");

    const showBtn = page.locator("button", { hasText: "Show uninterested lead" });
    await showBtn.click();

    const board = page.locator(".kk-board-row");
    await expect(board).toContainText("PW Test Owner OL");

    // ── 6. All Tenants: profile appears ───────────────────────────────────
    await page.goto("/database?view=tenants");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toContainText("PW Test Tenant OL");
  });
});

test.describe("Smoke: core pages load", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveTitle(/kakisewa/);
  });

  test("tenancies (lifecycle board) loads", async ({ page }) => {
    await page.goto("/tenancies");
    await expect(page).toHaveTitle(/kakisewa/);
    await expect(page.locator("h1")).toContainText("Renew old money");
  });

  test("leads (Make New Money) loads", async ({ page }) => {
    await page.goto("/leads");
    await expect(page).toHaveTitle(/kakisewa/);
    await expect(page.locator("h1")).toContainText("Make new money");
  });

  test("database (All Tenants) loads", async ({ page }) => {
    await page.goto("/database?view=tenants");
    await expect(page).toHaveTitle(/kakisewa/);
    await expect(page.locator("h1")).toContainText("All tenants");
  });

  test("performance page loads", async ({ page }) => {
    await page.goto("/performance");
    await expect(page).toHaveTitle(/kakisewa/);
  });
});
