import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { fetchFoundryWorlds } from "../list.ts";

describe("fetchFoundryWorlds", () => {
  it("GETs /api/foundry-worlds and returns the parsed world list", async () => {
    const worlds = [
      {
        id: 1,
        name: "kingmaker",
        pendingMacro: "// macro",
        pendingRenameCount: 1,
      },
    ];
    const fetchMock = stubFetch(new Response(JSON.stringify(worlds)));

    const result = await fetchFoundryWorlds();

    expect(fetchMock).toHaveBeenCalledWith("/api/foundry-worlds", undefined);
    expect(result).toEqual(worlds);
  });
});
