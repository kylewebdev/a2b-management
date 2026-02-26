import { test, expect } from "./fixtures";

test.describe("Authentication", () => {
  test("authenticated user can access dashboard", async ({ page }) => {
    await page.goto("/");
    // Clerk testing token provides auth, so we should land on dashboard (not sign-in)
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("sign-in");
  });

  test("authenticated user sees estates page", async ({ page }) => {
    await page.goto("/estates");
    await expect(page.getByText("Estates")).toBeVisible();
  });

  test("authenticated user can access settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Settings")).toBeVisible();
  });
});
