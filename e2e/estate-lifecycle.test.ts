import { test, expect } from "./fixtures";
import { createEstate } from "./helpers/seed";

test.describe("Estate Lifecycle", () => {
  test("can create a new estate", async ({ page }) => {
    await page.goto("/estates/new");
    await page.getByLabel("Address").fill("742 Evergreen Terrace");
    await page.getByRole("button", { name: "Create Estate" }).click();
    await expect(page).toHaveURL(/\/estates\//);
    await expect(page.getByText("742 Evergreen Terrace")).toBeVisible();
  });

  test("estate appears on the dashboard", async ({ page }) => {
    await createEstate(page, { address: "100 Dashboard Lane" });
    await page.goto("/");
    await expect(page.getByText("100 Dashboard Lane")).toBeVisible();
  });

  test("can view estate detail", async ({ page }) => {
    const { url } = await createEstate(page, { address: "200 Detail Ave" });
    await page.goto(url);
    await expect(page.getByText("200 Detail Ave")).toBeVisible();
    await expect(page.getByText("Items")).toBeVisible();
  });

  test("can edit an estate", async ({ page }) => {
    const { url } = await createEstate(page, { address: "300 Edit Blvd" });
    await page.goto(url);
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Estate Name").fill("Test Manor");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Test Manor")).toBeVisible();
  });

  test("can advance estate status", async ({ page }) => {
    const { url } = await createEstate(page, { address: "400 Status St" });
    await page.goto(url);

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Start Resolving" }).click();
    await expect(page.getByText("Resolving")).toBeVisible();
  });

  test("can delete an empty estate", async ({ page }) => {
    const { url } = await createEstate(page, { address: "500 Delete Dr" });
    await page.goto(url);

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/estates$/);
  });
});
