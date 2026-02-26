import { test, expect } from "./fixtures";

test.describe("Security E2E", () => {
  test("non-existent estate shows not found", async ({ page }) => {
    await page.goto("/estates/00000000-0000-0000-0000-000000000000");
    // Authenticated user visiting non-existent estate sees 404 page
    await expect(
      page.getByText("not found", { exact: false }).or(page.getByText("404"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("settings page renders with masked key field", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForSelector('[data-testid="settings-loading"]', { state: "detached", timeout: 10000 });
    // API key input is password type (masked)
    const keyInput = page.getByLabel(/API Key/);
    await expect(keyInput).toHaveAttribute("type", "password");
  });
});
