import { test as base, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const authFile = path.join(__dirname, ".clerk-auth.json");

function hasAuth(): boolean {
  if (!fs.existsSync(authFile)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(authFile, "utf-8"));
    return data.cookies && data.cookies.length > 0;
  } catch {
    return false;
  }
}

/**
 * Extended test that skips when Clerk auth is not configured.
 * Tests using this fixture require E2E_CLERK_USER_USERNAME and
 * E2E_CLERK_USER_PASSWORD to be set in .env.
 */
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    if (!hasAuth()) {
      testInfo.skip(true, "Clerk E2E credentials not configured");
      return;
    }
    await use(page);
  },
});

export { expect };
