import { RateLimiter } from "./rate-limit";

// Shared rate limiter for triage endpoints: 5 requests per 60 seconds per user
export const triageRateLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5 });
