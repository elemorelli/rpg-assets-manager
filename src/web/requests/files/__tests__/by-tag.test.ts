import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchFilesByTag } from "../by-tag.ts";

describe("fetchFilesByTag", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs with one tag param per tag", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([])));
    vi.stubGlobal("fetch", fetchMock);

    await fetchFilesByTag(["npc", "loot"]);

    expect(fetchMock).toHaveBeenCalledWith("/api/files/by-tag?tag=npc&tag=loot", undefined);
  });
});
