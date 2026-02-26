import { test, expect } from "./fixtures";

test.describe("Authentication", () => {
  test("authenticated user can access dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("sign-in");
  });

  test("authenticated user sees estates page", async ({ page }) => {
    await page.goto("/estates");
    await expect(page.getByRole("heading", { name: "Estates" })).toBeVisible();
  });

  test("authenticated user can access settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
