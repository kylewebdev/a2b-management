import path from "path";
import { test, expect } from "./fixtures";
import { createEstate } from "./helpers/seed";

test.describe("Upload and Triage", () => {
  test("can navigate to upload page", async ({ page }) => {
    const { url } = await createEstate(page, { address: "100 Upload Rd" });
    await page.goto(url);
    await page.getByRole("link", { name: "Upload Photos" }).first().click();
    await expect(page).toHaveURL(/\/upload$/);
    await expect(page.getByText("Upload Photos")).toBeVisible();
  });

  test("upload form shows file picker", async ({ page }) => {
    const { url } = await createEstate(page, { address: "200 Picker Ln" });
    await page.goto(`${url}/upload`);
    await expect(page.getByText("Tap to select photos")).toBeVisible();
    await expect(page.getByText("Take Photo")).toBeVisible();
  });

  test("can select an image file", async ({ page }) => {
    const { url } = await createEstate(page, { address: "300 Select Dr" });
    await page.goto(`${url}/upload`);

    // Create a test image
    const fileInput = page.locator("#photo-input");
    await fileInput.setInputFiles({
      name: "test.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(1024),
    });

    await expect(page.getByText("1 of 5 photos selected")).toBeVisible();
  });

  test.skip("can upload and item appears after triage", async () => {
    // Requires real API key — skipped in CI
  });
});
