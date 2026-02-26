import { test, expect } from "./fixtures";
import { createEstate } from "./helpers/seed";

test.describe("QR Code Labels", () => {
  test("can navigate to labels page directly", async ({ page }) => {
    const { id } = await createEstate(page, { address: "800 Label Lane" });
    await page.goto(`/estates/${id}/labels`);

    // Should see empty state since no triaged items
    await expect(page.getByText("No items ready for labels.")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Items must be triaged")).toBeVisible();
  });

  test("labels page shows back link to estate", async ({ page }) => {
    const { id } = await createEstate(page, { address: "801 Label Lane" });
    await page.goto(`/estates/${id}/labels`);

    const backLink = page.getByRole("link", { name: /Back to estate/ });
    await expect(backLink).toBeVisible({ timeout: 10000 });
    await backLink.click();
    await expect(page).toHaveURL(new RegExp(`/estates/${id}`), {
      timeout: 10000,
    });
  });

  test("labels page has print button", async ({ page }) => {
    const { id } = await createEstate(page, { address: "802 Label Lane" });
    await page.goto(`/estates/${id}/labels`);

    await expect(page.getByRole("button", { name: /Print Labels/ })).toBeVisible({
      timeout: 10000,
    });
  });

  test("labels page shows Labels heading", async ({ page }) => {
    const { id } = await createEstate(page, { address: "803 Label Lane" });
    await page.goto(`/estates/${id}/labels`);

    await expect(page.getByRole("heading", { name: "Labels" })).toBeVisible({
      timeout: 10000,
    });
  });
});
