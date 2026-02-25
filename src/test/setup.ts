import { vi, afterEach } from "vitest";

// Mock @clerk/nextjs/server globally
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_test123" }),
  clerkMiddleware: vi.fn(),
  createRouteMatcher: vi.fn(),
}));

// Clean up mocks between tests
afterEach(() => {
  vi.restoreAllMocks();
});
