import type { Page } from "@playwright/test";

export async function createEstate(page: Page, { address, name }: { address: string; name?: string }) {
  await page.goto("/estates/new");
  await page.getByLabel("Address").fill(address);
  if (name) {
    await page.getByLabel("Estate Name").fill(name);
  }
  await page.getByRole("button", { name: "Create Estate" }).click();
  await page.waitForURL(/\/estates\//);
  const url = page.url();
  const id = url.split("/estates/")[1]?.split("?")[0];
  return { id, url };
}
