// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RateLimiter } from "../rate-limit";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("allows requests under the limit", () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60_000 });
    expect(limiter.check("user1").allowed).toBe(true);
    expect(limiter.check("user1").allowed).toBe(true);
    expect(limiter.check("user1").allowed).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60_000 });
    limiter.check("user1");
    limiter.check("user1");
    const result = limiter.check("user1");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks users independently", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000 });
    limiter.check("user1");
    expect(limiter.check("user1").allowed).toBe(false);
    expect(limiter.check("user2").allowed).toBe(true);
  });

  it("allows requests after window expires", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });
    limiter.check("user1");
    expect(limiter.check("user1").allowed).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(limiter.check("user1").allowed).toBe(true);
  });

  it("returns retryAfterMs as time until window opens", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 10_000 });
    limiter.check("user1");
    const result = limiter.check("user1");
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(10_000);
  });

  it("uses sliding window (partial expiration)", () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 10_000 });

    limiter.check("user1"); // t=0
    vi.advanceTimersByTime(5000);
    limiter.check("user1"); // t=5000

    // At t=5000, both timestamps are in window
    expect(limiter.check("user1").allowed).toBe(false);

    // Advance past first timestamp's expiry
    vi.advanceTimersByTime(5001);
    // Now at t=10001, first timestamp (t=0) expired
    expect(limiter.check("user1").allowed).toBe(true);
  });

  it("reset clears a user's history", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000 });
    limiter.check("user1");
    expect(limiter.check("user1").allowed).toBe(false);

    limiter.reset("user1");
    expect(limiter.check("user1").allowed).toBe(true);
  });
});
