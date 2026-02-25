import { test, expect } from "./fixtures";

test.describe("Item Resolution", () => {
  // These tests require an estate with triaged items, which requires AI triage.
  // In a full E2E environment with seeded data, these would work.

  test.skip("can set disposition on a triaged item", async () => {
    // Requires seeded triaged item
  });

  test.skip("disposition status changes to resolved", async () => {
    // Requires seeded triaged item
  });

  test.skip("close estate prompt appears when all items resolved", async () => {
    // Requires all items resolved
  });

  test.skip("can close an estate", async () => {
    // Requires estate in resolving state with all items resolved
  });
});
