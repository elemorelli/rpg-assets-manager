import { describe, expect, it, vi } from "vitest";

import { createTtlCache } from "../ttl-cache.ts";

describe("createTtlCache", () => {
  it("returns the cached value without calling the fetcher again within the TTL", async () => {
    vi.useFakeTimers();

    try {
      const cache = createTtlCache<number>(1000);
      const fetcher = vi.fn().mockResolvedValue(1);

      await cache.get(fetcher);
      vi.advanceTimersByTime(500);
      const second = await cache.get(fetcher);

      expect(second).toBe(1);
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("re-fetches once the TTL has elapsed", async () => {
    vi.useFakeTimers();

    try {
      const cache = createTtlCache<number>(1000);
      const fetcher = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

      await cache.get(fetcher);
      vi.advanceTimersByTime(1001);
      const second = await cache.get(fetcher);

      expect(second).toBe(2);
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shares the in-flight fetch between concurrent callers on a cold cache", async () => {
    const cache = createTtlCache<string>(1000);
    const fetcher = vi.fn().mockResolvedValue("value");

    const [a, b] = await Promise.all([cache.get(fetcher), cache.get(fetcher)]);

    expect(a).toBe("value");
    expect(b).toBe("value");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not cache a rejected fetch, so the next call retries", async () => {
    const cache = createTtlCache<number>(1000);
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(2);

    await expect(cache.get(fetcher)).rejects.toThrow("boom");
    const second = await cache.get(fetcher);

    expect(second).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("forces a re-fetch after invalidate, even within the TTL", async () => {
    const cache = createTtlCache<number>(1000);
    const fetcher = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    await cache.get(fetcher);
    cache.invalidate();
    const second = await cache.get(fetcher);

    expect(second).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
