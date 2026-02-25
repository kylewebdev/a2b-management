import { vi } from "vitest";

let counter = 0;

/**
 * Override the Clerk auth mock for a single test.
 * Pass `null` for unauthenticated.
 */
export async function mockClerkUser(userId: string | null) {
  const clerk = await import("@clerk/nextjs/server");
  vi.mocked(clerk.auth).mockResolvedValue(
    userId ? ({ userId } as ReturnType<typeof clerk.auth> extends Promise<infer T> ? T : never) : ({ userId: null } as never)
  );
}

/**
 * Factory: create a test estate with sensible defaults.
 */
export function createTestEstate(overrides: Record<string, unknown> = {}) {
  counter++;
  return {
    name: `Test Estate ${counter}`,
    address: `${counter} Test Street`,
    userId: "user_test123",
    ...overrides,
  };
}

/**
 * Factory: create a test item linked to an estate.
 */
export function createTestItem(estateId: string, overrides: Record<string, unknown> = {}) {
  counter++;
  return {
    estateId,
    ...overrides,
  };
}

/**
 * Factory: create a test item photo linked to an item.
 */
export function createTestItemPhoto(itemId: string, overrides: Record<string, unknown> = {}) {
  counter++;
  return {
    itemId,
    r2Key: `photos/test-${counter}.jpg`,
    originalFilename: `test-photo-${counter}.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: 1024 * counter,
    sortOrder: counter,
    ...overrides,
  };
}

/**
 * Reset the factory counter between suites if needed.
 */
export function resetFactoryCounter() {
  counter = 0;
}
