import { test, expect } from "./fixtures";

test.describe("Settings", () => {
  test("settings page loads", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Settings")).toBeVisible();
    await expect(page.getByLabel("AI Provider")).toBeVisible();
  });

  test("provider select changes form", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForSelector('[data-testid="settings-loading"]', { state: "detached" });

    await page.getByLabel("AI Provider").selectOption("openai");
    await expect(page.getByText("OpenAI API Key")).toBeVisible();
  });

  test("API key field is masked", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForSelector('[data-testid="settings-loading"]', { state: "detached" });

    const keyInput = page.getByLabel(/API Key/);
    await expect(keyInput).toHaveAttribute("type", "password");
  });
});
