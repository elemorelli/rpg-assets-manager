import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { fetchTags } from "../list.ts";

describe("fetchTags", () => {
  it("GETs the distinct tag list", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify(["loot", "npc"])));

    const result = await fetchTags();

    expect(fetchMock).toHaveBeenCalledWith("/api/tags", undefined);
    expect(result).toEqual(["loot", "npc"]);
  });
});
