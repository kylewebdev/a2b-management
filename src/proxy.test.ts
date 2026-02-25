// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to test the route matcher logic and config export.
// Since clerkMiddleware and createRouteMatcher are mocked globally,
// we test by importing the module and verifying how it was configured.

describe("proxy", () => {
  let mockClerkMiddleware: ReturnType<typeof vi.fn>;
  let mockCreateRouteMatcher: ReturnType<typeof vi.fn>;
  let mockIsPublicRoute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockIsPublicRoute = vi.fn();
    mockCreateRouteMatcher = vi.fn().mockReturnValue(mockIsPublicRoute);
    mockClerkMiddleware = vi.fn();

    vi.doMock("@clerk/nextjs/server", () => ({
      clerkMiddleware: mockClerkMiddleware,
      createRouteMatcher: mockCreateRouteMatcher,
    }));
  });

  it("exports a config with a non-empty matcher array", async () => {
    const { config } = await import("./proxy");
    expect(config).toBeDefined();
    expect(config.matcher).toBeInstanceOf(Array);
    expect(config.matcher.length).toBeGreaterThan(0);
  });

  it("creates a route matcher for sign-in and sign-up", async () => {
    await import("./proxy");
    expect(mockCreateRouteMatcher).toHaveBeenCalledWith([
      "/sign-in(.*)",
      "/sign-up(.*)",
    ]);
  });

  it("calls clerkMiddleware with a handler function", async () => {
    await import("./proxy");
    expect(mockClerkMiddleware).toHaveBeenCalledWith(expect.any(Function));
  });

  describe("route protection logic", () => {
    let handler: (
      auth: { protect: ReturnType<typeof vi.fn> },
      req: { url: string }
    ) => Promise<void>;
    let mockProtect: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      await import("./proxy");
      handler = mockClerkMiddleware.mock.calls[0][0];
      mockProtect = vi.fn();
    });

    const publicRoutes = [
      "/sign-in",
      "/sign-in/factor-one",
      "/sign-up",
      "/sign-up/verify",
    ];

    const protectedRoutes = [
      "/",
      "/estates",
      "/estates/new",
      "/estates/abc-123",
      "/estates/abc-123/upload",
      "/settings",
      "/api/estates",
      "/api/items/abc-123",
    ];

    for (const route of publicRoutes) {
      it(`does NOT protect public route: ${route}`, async () => {
        mockIsPublicRoute.mockReturnValue(true);
        const auth = { protect: mockProtect };
        await handler(auth, { url: `http://localhost:3000${route}` });
        expect(mockProtect).not.toHaveBeenCalled();
      });
    }

    for (const route of protectedRoutes) {
      it(`protects route: ${route}`, async () => {
        mockIsPublicRoute.mockReturnValue(false);
        const auth = { protect: mockProtect };
        await handler(auth, { url: `http://localhost:3000${route}` });
        expect(mockProtect).toHaveBeenCalled();
      });
    }
  });
});
