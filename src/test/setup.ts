import { vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock @clerk/nextjs/server globally
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_test123" }),
  clerkMiddleware: vi.fn(),
  createRouteMatcher: vi.fn(),
}));

// Mock toast globally so components that call useToast() work without ToastProvider
vi.mock("@/components/toast", () => ({
  useToast: () => ({ addToast: vi.fn(), removeToast: vi.fn(), toasts: [] }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  ToastContainer: () => null,
}));

// Clean up mocks between tests
afterEach(() => {
  vi.restoreAllMocks();
});
