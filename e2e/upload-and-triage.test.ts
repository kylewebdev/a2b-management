import { test, expect } from "./fixtures";
import { createEstate } from "./helpers/seed";

test.describe("Upload and Triage", () => {
  test("can navigate to upload page", async ({ page }) => {
    const { url } = await createEstate(page, { address: "100 Upload Rd" });
    await page.goto(url);
    await expect(page.getByText("100 Upload Rd")).toBeVisible({ timeout: 10000 });
    await page.getByRole("link", { name: "Upload Photos" }).first().click();
    await expect(page).toHaveURL(/\/upload$/, { timeout: 10000 });
  });

  test("upload form shows file picker", async ({ page }) => {
    const { id } = await createEstate(page, { address: "200 Picker Ln" });
    await page.goto(`/estates/${id}/upload`);
    await expect(page.getByText("Tap to select photos")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Take Photo")).toBeVisible();
  });

  test("can select an image file", async ({ page }) => {
    const { id } = await createEstate(page, { address: "300 Select Dr" });
    await page.goto(`/estates/${id}/upload`);
    await expect(page.getByText("Tap to select photos")).toBeVisible({ timeout: 10000 });

    const fileInput = page.locator("#photo-input");
    await fileInput.setInputFiles({
      name: "test.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(1024),
    });

    await expect(page.getByText("1 of 5 photos selected")).toBeVisible({ timeout: 10000 });
  });

  test.skip("can upload and item appears after triage", async () => {
    // Requires real API key — skipped in CI
  });
});
