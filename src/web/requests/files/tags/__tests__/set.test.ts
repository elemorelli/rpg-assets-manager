import { afterEach, describe, expect, it, vi } from "vitest";

import { setAssetTags } from "../set.ts";

describe("setAssetTags", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUTs the path and tags, and returns the normalized tags from the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ tags: ["npc"] })));
    vi.stubGlobal("fetch", fetchMock);

    const result = await setAssetTags("tiles/npc.png", ["NPC"]);

    expect(fetchMock).toHaveBeenCalledWith("/api/files/tags", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "tiles/npc.png", tags: ["NPC"] }),
    });
    expect(result).toEqual(["npc"]);
  });
});
