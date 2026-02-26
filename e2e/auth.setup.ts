import { clerk } from "@clerk/testing/playwright";
import { test as setup, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

export const authFile = path.join(__dirname, ".clerk-auth.json");

// Ensure auth file exists (empty state) so dependent tests don't crash
const emptyState = JSON.stringify({ cookies: [], origins: [] });
if (!fs.existsSync(authFile)) {
  fs.writeFileSync(authFile, emptyState);
}

setup("authenticate", async ({ page }) => {
  const username = process.env.E2E_CLERK_USER_USERNAME;
  const password = process.env.E2E_CLERK_USER_PASSWORD;

  if (!username || !password) {
    console.warn(
      "\n⚠ E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD not set.\n" +
        "  Tests requiring auth will be redirected to sign-in.\n" +
        "  Create a test user in Clerk and add credentials to .env\n"
    );
    // Write empty state so dependent tests don't crash on missing file
    fs.writeFileSync(authFile, emptyState);
    return;
  }

  await page.goto("/");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: username,
      password: password,
    },
  });

  // Wait for redirect away from sign-in
  await expect(page).not.toHaveURL(/sign-in/, { timeout: 15000 });

  // Save authenticated state
  await page.context().storageState({ path: authFile });
});
