import { test, expect } from "./fixtures";

test.describe("Settings", () => {
  test("settings page loads", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    // Wait for the form to finish loading (client component fetches settings)
    await expect(page.getByLabel("AI Provider")).toBeVisible({ timeout: 15000 });
  });

  test("provider select changes form", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByLabel("AI Provider")).toBeVisible({ timeout: 15000 });

    await page.getByLabel("AI Provider").selectOption("openai");
    await expect(page.getByLabel("OpenAI API Key")).toBeVisible();
  });

  test("API key field is masked", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByLabel(/API Key/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel(/API Key/)).toHaveAttribute("type", "password");
  });
});
