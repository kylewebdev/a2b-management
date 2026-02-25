import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("unauthenticated users are redirected to sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("unauthenticated API calls return 401", async ({ request }) => {
    const res = await request.get("/api/estates");
    expect(res.status()).toBe(401);
  });

  test("unauthenticated triage API returns 401", async ({ request }) => {
    const res = await request.post("/api/items/fake-id/triage");
    expect(res.status()).toBe(401);
  });
});
