import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { fetchFoundryPlaylistTags } from "../playlist-tags.ts";

describe("fetchFoundryPlaylistTags", () => {
  it("GETs /api/foundry-worlds/playlists and returns the parsed tag list", async () => {
    const tags = [{ tag: "storm", count: 3 }];
    const fetchMock = stubFetch(new Response(JSON.stringify(tags)));

    const result = await fetchFoundryPlaylistTags();

    expect(fetchMock).toHaveBeenCalledWith("/api/foundry-worlds/playlists", undefined);
    expect(result).toEqual(tags);
  });
});
