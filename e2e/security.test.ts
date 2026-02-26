import { test, expect } from "./fixtures";

test.describe("Security E2E", () => {
  test("non-existent estate shows not found", async ({ page }) => {
    await page.goto("/estates/00000000-0000-0000-0000-000000000000");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible({ timeout: 15000 });
  });

  test("settings page renders with masked key field", async ({ page }) => {
    await page.goto("/settings");
    // Wait for the client-side settings form to load
    await expect(page.getByLabel(/API Key/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel(/API Key/)).toHaveAttribute("type", "password");
  });
});
