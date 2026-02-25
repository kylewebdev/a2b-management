interface RetryOptions {
  retries?: number;
  delay?: number;
}

export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  { retries = 2, delay = 1000 }: RetryOptions = {}
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);

      // Don't retry client errors (4xx)
      if (res.status >= 400 && res.status < 500) return res;

      // Retry server errors (5xx)
      if (res.status >= 500) {
        lastError = new Error(`Server error: ${res.status}`);
        if (attempt < retries) {
          await sleep(delay * Math.pow(2, attempt));
          continue;
        }
        return res;
      }

      return res;
    } catch (err) {
      // Network error — retry
      lastError = err instanceof Error ? err : new Error("Network error");
      if (attempt < retries) {
        await sleep(delay * Math.pow(2, attempt));
      }
    }
  }

  throw lastError ?? new Error("fetchWithRetry failed");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
