import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchTags } from "../list.ts";

describe("fetchTags", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs the distinct tag list", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(["loot", "npc"])));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchTags();

    expect(fetchMock).toHaveBeenCalledWith("/api/tags", undefined);
    expect(result).toEqual(["loot", "npc"]);
  });
});
