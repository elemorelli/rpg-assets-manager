import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { fetchFilesByTag } from "../by-tag.ts";

describe("fetchFilesByTag", () => {
  it("GETs with one tag param per tag", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify([])));

    await fetchFilesByTag(["npc", "loot"]);

    expect(fetchMock).toHaveBeenCalledWith("/api/files/by-tag?tag=npc&tag=loot", undefined);
  });
});
