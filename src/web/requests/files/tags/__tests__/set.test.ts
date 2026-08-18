import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { setAssetTags } from "../set.ts";

describe("setAssetTags", () => {
  it("PUTs the path and tags, and returns the normalized tags from the response", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ tags: ["npc"] })));

    const result = await setAssetTags("tiles/npc.png", ["NPC"]);

    expect(fetchMock).toHaveBeenCalledWith("/api/files/tags", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "tiles/npc.png", tags: ["NPC"] }),
    });
    expect(result).toEqual(["npc"]);
  });
});
