interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

interface SlidingWindowEntry {
  timestamps: number[];
}

export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private store = new Map<string, SlidingWindowEntry>();

  constructor({ windowMs = 60_000, maxRequests = 5 }: { windowMs?: number; maxRequests?: number } = {}) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Remove expired timestamps
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= this.maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = oldestInWindow + this.windowMs - now;
      return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) };
    }

    entry.timestamps.push(now);
    return { allowed: true, retryAfterMs: 0 };
  }

  reset(key: string) {
    this.store.delete(key);
  }
}
