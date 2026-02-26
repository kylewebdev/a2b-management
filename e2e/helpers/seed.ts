import type { Page } from "@playwright/test";

export async function createEstate(page: Page, { address, name }: { address: string; name?: string }) {
  await page.goto("/estates/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Address").fill(address);
  if (name) {
    await page.getByLabel("Estate Name").fill(name);
  }
  await page.getByRole("button", { name: "Create Estate" }).click();
  // Wait for redirect to estate detail page (UUID pattern, not /estates/new)
  await page.waitForURL(/\/estates\/[0-9a-f]{8}-/, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  const url = page.url();
  const id = url.split("/estates/")[1]?.split("?")[0];
  return { id, url };
}
