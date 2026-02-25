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
 * Factory: create a mock File for upload tests.
 */
export function createMockFile(
  name = "photo.jpg",
  type = "image/jpeg",
  sizeBytes = 1024
): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], name, { type });
}

/**
 * Factory: create test app settings.
 */
export function createTestAppSettings(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    aiProvider: "anthropic" as const,
    aiModel: "claude-sonnet-4-20250514",
    apiKeyAnthropic: "encrypted:test-key",
    apiKeyOpenai: null,
    apiKeyGoogle: null,
    updatedAt: new Date(),
    updatedBy: "user_test123",
    ...overrides,
  };
}

/**
 * Reset the factory counter between suites if needed.
 */
export function resetFactoryCounter() {
  counter = 0;
}
