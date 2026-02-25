// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchWithRetry } from "../fetch-with-retry";

describe("fetchWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("returns response on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ok", { status: 200 })));
    const res = await fetchWithRetry("/test");
    expect(res.status).toBe(200);
  });

  it("does not retry on 4xx errors", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
    vi.stubGlobal("fetch", mockFetch);

    const res = await fetchWithRetry("/test", undefined, { retries: 2, delay: 10 });
    expect(res.status).toBe(400);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx errors with exponential backoff", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response("error", { status: 500 }))
      .mockResolvedValueOnce(new Response("error", { status: 500 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    const res = await fetchWithRetry("/test", undefined, { retries: 2, delay: 10 });
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("retries on network errors", async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    const res = await fetchWithRetry("/test", undefined, { retries: 2, delay: 10 });
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries on network error", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    await expect(fetchWithRetry("/test", undefined, { retries: 1, delay: 10 })).rejects.toThrow("Network error");
    expect(mockFetch).toHaveBeenCalledTimes(2); // initial + 1 retry
  });

  it("returns last 5xx response when retries exhausted", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("error", { status: 503 }));
    vi.stubGlobal("fetch", mockFetch);

    const res = await fetchWithRetry("/test", undefined, { retries: 1, delay: 10 });
    expect(res.status).toBe(503);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
