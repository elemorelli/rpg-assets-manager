import { afterEach, describe, expect, it, vi } from "vitest";
import { purgeCloudflareCache } from "../client.ts";

const FULL_BATCH_SIZE = 30;
const REMAINDER_BATCH_SIZE = 5;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("purgeCloudflareCache", () => {
  it("purges urls in batches of 30 with the zone id and bearer token", async () => {
    const urls = Array.from(
      { length: FULL_BATCH_SIZE + REMAINDER_BATCH_SIZE },
      (_, index) => `https://assets.example.com/${index}.png`,
    );
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await purgeCloudflareCache(urls, { zoneId: "zone-1", apiToken: "token-1" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstUrl, firstInit] = fetchMock.mock.calls[0];
    expect(firstUrl).toBe("https://api.cloudflare.com/client/v4/zones/zone-1/purge_cache");
    expect(firstInit).toMatchObject({
      method: "POST",
      headers: { Authorization: "Bearer token-1", "Content-Type": "application/json" },
    });
    expect(JSON.parse(firstInit.body).files).toHaveLength(FULL_BATCH_SIZE);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).files).toHaveLength(REMAINDER_BATCH_SIZE);
  });

  it("throws when Cloudflare responds with a non-ok status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      purgeCloudflareCache(["https://assets.example.com/a.png"], {
        zoneId: "zone-1",
        apiToken: "token-1",
      }),
    ).rejects.toThrow("403");
  });
});
