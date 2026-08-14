import { afterEach, describe, expect, it, vi } from "vitest";
import { rescan } from "../rescan.ts";

describe("rescan", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs a JSON body defaulting forceRehash to false", async () => {
    const summary = { hashed: 2, unchanged: 1, removed: 0 };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(summary)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await rescan();

    expect(fetchMock).toHaveBeenCalledWith("/api/rescan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceRehash: false }),
    });
    expect(result).toEqual(summary);
  });

  it("forwards forceRehash when set", async () => {
    const summary = { hashed: 2, unchanged: 0, removed: 0 };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(summary)));
    vi.stubGlobal("fetch", fetchMock);

    await rescan(true);

    expect(fetchMock).toHaveBeenCalledWith("/api/rescan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceRehash: true }),
    });
  });
});
