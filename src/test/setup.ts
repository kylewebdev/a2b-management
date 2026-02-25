import { vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

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
