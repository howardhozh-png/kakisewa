import { test, expect } from "@playwright/test";

const PROD = "https://kakisewa.com";

test.use({ baseURL: PROD });

test("landing page loads on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({ path: "prod-landing-mobile.png" });
  await expect(page).toHaveTitle(/kakisewa/i);
});

test("landing page loads on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.screenshot({ path: "prod-landing-desktop.png" });
  await expect(page).toHaveTitle(/kakisewa/i);
});

test("sign-in page — 8-box passcode renders on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await page.screenshot({ path: "prod-signin-mobile.png" });
  // Hidden sr-only input with aria-label confirms PasscodeInput rendered
  await expect(page.locator('[aria-label="8-digit passcode"]')).toHaveCount(1);
});

test("sign-in page — 8-box passcode renders on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/sign-in");
  await page.screenshot({ path: "prod-signin-desktop.png" });
  await expect(page.locator('[aria-label="8-digit passcode"]')).toHaveCount(1);
});

test("sign-up page — no Name/Agency fields, only email + passcode", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-up");
  await page.screenshot({ path: "prod-signup-mobile.png" });
  // Should NOT have name or agency fields
  await expect(page.locator('input[name="name"], input[placeholder*="Full name" i]')).toHaveCount(0);
  await expect(page.locator('input[name="agency"], input[placeholder*="agency" i]')).toHaveCount(0);
  // Should have email field
  await expect(page.locator('input[type="email"]')).toHaveCount(1);
  // Hidden sr-only input confirms PasscodeInput rendered
  await expect(page.locator('[aria-label="8-digit passcode"]')).toHaveCount(1);
});

test("sign-up page desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/sign-up");
  await page.screenshot({ path: "prod-signup-desktop.png" });
});

test("unauthenticated routes redirect to sign-in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/home", "/existing-contracts", "/new-owners"]) {
    await page.goto(path);
    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in|login/);
  }
});
