import { test, expect } from "./fixtures";
import { createEstate } from "./helpers/seed";

test.describe("Estate Lifecycle", () => {
  test("can create a new estate", async ({ page }) => {
    await page.goto("/estates/new");
    await page.getByLabel("Address").fill("742 Evergreen Terrace");
    await page.getByRole("button", { name: "Create Estate" }).click();
    await page.waitForURL(/\/estates\/[0-9a-f]{8}-/, { timeout: 15000 });
    await expect(page.getByText("742 Evergreen Terrace")).toBeVisible();
  });

  test("estate appears on the dashboard", async ({ page }) => {
    await createEstate(page, { address: "100 Dashboard Lane" });
    await page.goto("/");
    await expect(page.getByText("100 Dashboard Lane").first()).toBeVisible({ timeout: 10000 });
  });

  test("can view estate detail", async ({ page }) => {
    const { url } = await createEstate(page, { address: "200 Detail Ave" });
    await page.goto(url);
    await expect(page.getByText("200 Detail Ave")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Items", exact: false })).toBeVisible();
  });

  test("can edit an estate", async ({ page }) => {
    const { url } = await createEstate(page, { address: "300 Edit Blvd" });
    await page.goto(url);
    await expect(page.getByText("300 Edit Blvd")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Estate Name").fill("Test Manor");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Test Manor")).toBeVisible({ timeout: 10000 });
  });

  test("can change estate status via dropdown", async ({ page }) => {
    const { url } = await createEstate(page, { address: "400 Status St" });
    await page.goto(url);
    await expect(page.getByText("400 Status St")).toBeVisible({ timeout: 10000 });

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByLabel("Estate status").selectOption("resolving");
    await expect(page.getByText("Resolving")).toBeVisible({ timeout: 10000 });
  });

  test("can delete an empty estate", async ({ page }) => {
    const { url } = await createEstate(page, { address: "500 Delete Dr" });
    await page.goto(url);
    await expect(page.getByText("500 Delete Dr")).toBeVisible({ timeout: 10000 });

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/estates$/, { timeout: 10000 });
  });
});
